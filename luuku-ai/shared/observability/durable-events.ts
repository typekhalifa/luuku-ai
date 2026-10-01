import { prisma } from "../database/client.js";
import type { ExecutionOwnership } from "../../orchestration/ownership.js";

export type ObservabilitySeverity = "INFO" | "WARN" | "ERROR";

export interface RecordObservabilityEventInput {
    eventType: string;
    source: string;
    ownership?: ExecutionOwnership;
    executionId?: string;
    workflowId?: string;
    requestId?: string;
    traceId?: string;
    severity?: ObservabilitySeverity;
    status?: string;
    actorType?: string;
    actorId?: string;
    metadata?: Record<string, unknown>;
    occurredAt?: Date;
}

export async function recordObservabilityEvent(input: RecordObservabilityEventInput) {
    const ownership = input.ownership ?? { scope: "SYSTEM" as const };
    const companyId = ownership.scope === "COMPANY" ? ownership.companyId : null;
    return prisma.observabilityEvent.create({
        data: {
            ownershipScope: ownership.scope,
            companyId,
            eventType: input.eventType,
            source: input.source,
            executionId: input.executionId,
            workflowId: input.workflowId,
            requestId: input.requestId,
            traceId: input.traceId,
            severity: input.severity ?? "INFO",
            status: input.status,
            actorType: input.actorType,
            actorId: input.actorId,
            metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
            occurredAt: input.occurredAt,
        },
    });
}

export interface ObservabilityEventQuery {
    companyId: string;
    executionId?: string;
    workflowId?: string;
    eventType?: string;
    severity?: ObservabilitySeverity;
    from?: Date;
    to?: Date;
    limit?: number;
}

export async function listCompanyObservabilityEvents(query: ObservabilityEventQuery) {
    if (!query.companyId.trim()) throw new Error("COMPANY_CONTEXT_REQUIRED");
    return prisma.observabilityEvent.findMany({
        where: {
            ownershipScope: "COMPANY",
            companyId: query.companyId,
            executionId: query.executionId,
            workflowId: query.workflowId,
            eventType: query.eventType,
            severity: query.severity,
            occurredAt: {
                gte: query.from,
                lte: query.to,
            },
        },
        orderBy: { occurredAt: "desc" },
        take: Math.min(Math.max(query.limit ?? 100, 1), 500),
    });
}

export async function getCompanyObservabilityDashboard(companyId: string, from: Date, to: Date) {
    if (!companyId.trim()) throw new Error("COMPANY_CONTEXT_REQUIRED");

    const where = {
        ownershipScope: "COMPANY",
        companyId,
        occurredAt: { gte: from, lte: to },
    };

    const [
        requests,
        request5xx,
        request4xx,
        executionsStarted,
        executionsSucceeded,
        executionsFailed,
        providersSucceeded,
        providersFailed,
        httpEvents,
    ] = await Promise.all([
        prisma.observabilityEvent.count({ where: { ...where, eventType: "http.request.completed" } }),
        prisma.observabilityEvent.count({
            where: { ...where, eventType: "http.request.completed", status: { startsWith: "5" } },
        }),
        prisma.observabilityEvent.count({
            where: { ...where, eventType: "http.request.completed", status: { startsWith: "4" } },
        }),
        prisma.observabilityEvent.count({ where: { ...where, eventType: "execution.started" } }),
        prisma.observabilityEvent.count({ where: { ...where, eventType: "execution.succeeded" } }),
        prisma.observabilityEvent.count({ where: { ...where, eventType: "execution.failed" } }),
        prisma.observabilityEvent.count({ where: { ...where, eventType: "provider.succeeded" } }),
        prisma.observabilityEvent.count({ where: { ...where, eventType: "provider.failed" } }),
        prisma.observabilityEvent.findMany({
            where: { ...where, eventType: "http.request.completed" },
            select: { metadata: true },
            orderBy: { occurredAt: "desc" },
            take: 5000,
        }),
    ]);

    const durations = httpEvents
        .map((event) => {
            const metadata = event.metadata;
            if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
            const durationMs = (metadata as Record<string, unknown>).durationMs;
            return typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs >= 0
                ? durationMs
                : undefined;
        })
        .filter((duration): duration is number => duration !== undefined);

    const totalRequestDurationMs = durations.reduce((sum, duration) => sum + duration, 0);

    return {
        companyId,
        from: from.toISOString(),
        to: to.toISOString(),
        requests,
        request4xx,
        request5xx,
        requestErrorRate: requests > 0 ? (request4xx + request5xx) / requests : 0,
        latency: {
            samples: durations.length,
            averageMs: durations.length > 0 ? totalRequestDurationMs / durations.length : 0,
            maxMs: durations.length > 0 ? Math.max(...durations) : 0,
        },
        executions: {
            started: executionsStarted,
            succeeded: executionsSucceeded,
            failed: executionsFailed,
        },
        providers: {
            succeeded: providersSucceeded,
            failed: providersFailed,
        },
    };
}

export async function getCompanyObservabilitySummary(companyId: string, from: Date, to: Date) {
    if (!companyId.trim()) throw new Error("COMPANY_CONTEXT_REQUIRED");
    const where = { ownershipScope: "COMPANY", companyId, occurredAt: { gte: from, lte: to } };
    const [total, errors, warnings, grouped] = await Promise.all([
        prisma.observabilityEvent.count({ where }),
        prisma.observabilityEvent.count({ where: { ...where, severity: "ERROR" } }),
        prisma.observabilityEvent.count({ where: { ...where, severity: "WARN" } }),
        prisma.observabilityEvent.groupBy({
            by: ["eventType"],
            where,
            _count: { _all: true },
            orderBy: { _count: { eventType: "desc" } },
            take: 20,
        }),
    ]);
    return {
        companyId,
        from: from.toISOString(),
        to: to.toISOString(),
        total,
        errors,
        warnings,
        byEventType: grouped.map((item) => ({ eventType: item.eventType, count: item._count._all })),
    };
}
