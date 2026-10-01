export type LogLevel = "INFO" | "WARN" | "ERROR";

export interface StructuredLogContext {
    requestId?: string;
    traceId?: string;
    companyId?: string;
    userId?: string;
    method?: string;
    route?: string;
    statusCode?: number;
    durationMs?: number;
    error?: string;
    [key: string]: unknown;
}

export function logStructured(
    level: LogLevel,
    event: string,
    context: StructuredLogContext = {},
): void {
    const payload = {
        timestamp: new Date().toISOString(),
        level,
        service: "luuku-api",
        event,
        ...context,
    };

    const line = JSON.stringify(payload);

    if (level === "ERROR") {
        console.error(line);
        return;
    }

    if (level === "WARN") {
        console.warn(line);
        return;
    }

    console.log(line);
}
