export interface RequestMetricSnapshot {
    requestsTotal: number;
    responsesByStatus: Record<string, number>;
    errorsTotal: number;
    totalDurationMs: number;
    maxDurationMs: number;
    startedAt: string;
    lastRequestAt: string | null;
}

interface RouteMetric {
    requests: number;
    errors: number;
    totalDurationMs: number;
    maxDurationMs: number;
}

const startedAt = new Date().toISOString();
let requestsTotal = 0;
let errorsTotal = 0;
let totalDurationMs = 0;
let maxDurationMs = 0;
let lastRequestAt: string | null = null;

const responsesByStatus: Record<string, number> = {};
const routes = new Map<string, RouteMetric>();

export function recordHttpRequest(input: {
    method: string;
    route: string;
    statusCode: number;
    durationMs: number;
}): void {
    const durationMs = Math.max(0, input.durationMs);
    const statusFamily = String(input.statusCode);
    const routeKey = `${input.method.toUpperCase()} ${input.route}`;

    requestsTotal += 1;
    totalDurationMs += durationMs;
    maxDurationMs = Math.max(maxDurationMs, durationMs);
    lastRequestAt = new Date().toISOString();
    responsesByStatus[statusFamily] = (responsesByStatus[statusFamily] ?? 0) + 1;

    const routeMetric = routes.get(routeKey) ?? {
        requests: 0,
        errors: 0,
        totalDurationMs: 0,
        maxDurationMs: 0,
    };

    routeMetric.requests += 1;
    routeMetric.totalDurationMs += durationMs;
    routeMetric.maxDurationMs = Math.max(routeMetric.maxDurationMs, durationMs);

    if (input.statusCode >= 500) {
        errorsTotal += 1;
        routeMetric.errors += 1;
    }

    routes.set(routeKey, routeMetric);
}

export function getRequestMetricSnapshot(): RequestMetricSnapshot & {
    routes: Record<string, RouteMetric>;
} {
    return {
        requestsTotal,
        responsesByStatus: { ...responsesByStatus },
        errorsTotal,
        totalDurationMs,
        maxDurationMs,
        startedAt,
        lastRequestAt,
        routes: Object.fromEntries(
            [...routes.entries()].map(([route, metric]) => [
                route,
                { ...metric },
            ]),
        ),
    };
}

function escapePrometheusLabel(value: string): string {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\\"')
        .replace(/\n/g, "\\n");
}

export function renderPrometheusMetrics(): string {
    const snapshot = getRequestMetricSnapshot();
    const lines = [
        "# HELP luuku_http_requests_total Total HTTP requests handled by this process.",
        "# TYPE luuku_http_requests_total counter",
        `luuku_http_requests_total ${snapshot.requestsTotal}`,
        "# HELP luuku_http_errors_total HTTP responses with status 500 or greater.",
        "# TYPE luuku_http_errors_total counter",
        `luuku_http_errors_total ${snapshot.errorsTotal}`,
        "# HELP luuku_http_response_duration_ms_total Sum of HTTP response durations in milliseconds.",
        "# TYPE luuku_http_response_duration_ms_total counter",
        `luuku_http_response_duration_ms_total ${snapshot.totalDurationMs}`,
        "# HELP luuku_http_response_duration_ms_max Maximum observed HTTP response duration in milliseconds.",
        "# TYPE luuku_http_response_duration_ms_max gauge",
        `luuku_http_response_duration_ms_max ${snapshot.maxDurationMs}`,
    ];

    for (const [status, count] of Object.entries(snapshot.responsesByStatus)) {
        lines.push(
            `luuku_http_responses_total{status="${escapePrometheusLabel(status)}"} ${count}`,
        );
    }

    for (const [route, metric] of Object.entries(snapshot.routes)) {
        const [method, ...routeParts] = route.split(" ");
        const routeName = routeParts.join(" ");

        lines.push(
            `luuku_http_route_requests_total{method="${escapePrometheusLabel(method)}",route="${escapePrometheusLabel(routeName)}"} ${metric.requests}`,
        );
        lines.push(
            `luuku_http_route_errors_total{method="${escapePrometheusLabel(method)}",route="${escapePrometheusLabel(routeName)}"} ${metric.errors}`,
        );
        lines.push(
            `luuku_http_route_duration_ms_total{method="${escapePrometheusLabel(method)}",route="${escapePrometheusLabel(routeName)}"} ${metric.totalDurationMs}`,
        );
        lines.push(
            `luuku_http_route_duration_ms_max{method="${escapePrometheusLabel(method)}",route="${escapePrometheusLabel(routeName)}"} ${metric.maxDurationMs}`,
        );
    }

    return `${lines.join("\n")}\n`;
}
