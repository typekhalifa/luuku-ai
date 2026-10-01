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
