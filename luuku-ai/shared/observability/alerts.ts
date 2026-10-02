import { listCompanyObservabilityEvents } from "./durable-events.js";

export type ObservabilityAlertSeverity = "WARN" | "ERROR";

export interface ObservabilityAlert {
    code: string;
    severity: ObservabilityAlertSeverity;
    message: string;
    count: number;
    windowMinutes: number;
    eventTypes: string[];
}

export interface ObservabilityAlertThresholds {
    windowMinutes: number;
    http5xxCount: number;
    providerFailureCount: number;
    securityViolationCount: number;
    executionFailureCount: number;
}

const DEFAULT_THRESHOLDS: ObservabilityAlertThresholds = {
    windowMinutes: 15,
    http5xxCount: 5,
    providerFailureCount: 3,
    securityViolationCount: 1,
    executionFailureCount: 5,
};

function threshold(value: number | undefined, fallback: number): number {
    return Number.isFinite(value) && value !== undefined && value > 0 ? value : fallback;
}

export function normalizeObservabilityAlertThresholds(
    input: Partial<ObservabilityAlertThresholds> = {},
): ObservabilityAlertThresholds {
    return {
        windowMinutes: threshold(input.windowMinutes, DEFAULT_THRESHOLDS.windowMinutes),
        http5xxCount: threshold(input.http5xxCount, DEFAULT_THRESHOLDS.http5xxCount),
        providerFailureCount: threshold(input.providerFailureCount, DEFAULT_THRESHOLDS.providerFailureCount),
        securityViolationCount: threshold(input.securityViolationCount, DEFAULT_THRESHOLDS.securityViolationCount),
        executionFailureCount: threshold(input.executionFailureCount, DEFAULT_THRESHOLDS.executionFailureCount),
    };
}

export async function evaluateCompanyObservabilityAlerts(
    companyId: string,
    now = new Date(),
    configuredThresholds: Partial<ObservabilityAlertThresholds> = {},
): Promise<ObservabilityAlert[]> {
    if (!companyId.trim()) throw new Error("COMPANY_CONTEXT_REQUIRED");

    const thresholds = normalizeObservabilityAlertThresholds(configuredThresholds);
    const from = new Date(now.getTime() - thresholds.windowMinutes * 60_000);
    const events = await listCompanyObservabilityEvents({
        companyId,
        from,
        to: now,
        limit: 500,
    });

    const alerts: ObservabilityAlert[] = [];
    const checks = [
        {
            code: "HTTP_5XX_SPIKE",
            severity: "ERROR" as const,
            message: "Repeated HTTP 5xx responses detected.",
            threshold: thresholds.http5xxCount,
            eventTypes: ["http.request.completed"],
        },
        {
            code: "PROVIDER_FAILURE_SPIKE",
            severity: "ERROR" as const,
            message: "Repeated external provider execution failures detected.",
            threshold: thresholds.providerFailureCount,
            eventTypes: ["provider.failed", "execution.failed"],
        },
        {
            code: "SECURITY_VIOLATION",
            severity: "ERROR" as const,
            message: "Tenant or authentication security violations detected.",
            threshold: thresholds.securityViolationCount,
            eventTypes: ["security.tenant_violation", "security.authentication_failure", "security.authorization_failure"],
        },
        {
            code: "EXECUTION_FAILURE_SPIKE",
            severity: "WARN" as const,
            message: "Repeated workflow execution failures detected.",
            threshold: thresholds.executionFailureCount,
            eventTypes: ["execution.failed"],
        },
    ];

    for (const check of checks) {
        const matchingEvents = events.filter((event) => {
            if (!check.eventTypes.includes(event.eventType)) return false;
            if (check.code === "HTTP_5XX_SPIKE") return event.status?.startsWith("5");
            return true;
        });

        if (matchingEvents.length >= check.threshold) {
            alerts.push({
                code: check.code,
                severity: check.severity,
                message: check.message,
                count: matchingEvents.length,
                windowMinutes: thresholds.windowMinutes,
                eventTypes: check.eventTypes,
            });
        }
    }

    return alerts;
}
