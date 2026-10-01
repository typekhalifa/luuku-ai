import {
    getRequestMetricSnapshot,
    recordHttpRequest,
    renderPrometheusMetrics,
} from "../../observability";

recordHttpRequest({
    method: "GET",
    route: "/healthz",
    statusCode: 200,
    durationMs: 4,
});

recordHttpRequest({
    method: "GET",
    route: "/api/v1/crm",
    statusCode: 500,
    durationMs: 25,
});

const snapshot = getRequestMetricSnapshot();
const prometheus = renderPrometheusMetrics();

if (snapshot.requestsTotal < 2) {
    throw new Error("Observability metrics did not record requests.");
}

if (snapshot.errorsTotal < 1) {
    throw new Error("Observability metrics did not record server errors.");
}

if (!prometheus.includes("luuku_http_requests_total")) {
    throw new Error("Prometheus metrics output is missing request counter.");
}

if (!prometheus.includes('status="500"')) {
    throw new Error("Prometheus metrics output is missing status counter.");
}

console.log("V8.10 observability metrics validation: PASS");
