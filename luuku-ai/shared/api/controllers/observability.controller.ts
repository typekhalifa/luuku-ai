import type { Request, Response } from "express";
import { getCompanyObservabilityDashboard, getCompanyObservabilitySummary, listCompanyObservabilityEvents } from "../../observability/durable-events.js";
import { evaluateCompanyObservabilityAlerts } from "../../observability/alerts.js";

function companyIdOf(response: Response): string | undefined {
    return (response.locals.apiRequestContext as { companyId?: string } | undefined)?.companyId;
}

function parseDate(value: unknown): Date | undefined {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function getObservabilityEvents(request: Request, response: Response): Promise<void> {
    const companyId = companyIdOf(response);
    if (!companyId) {
        response.status(403).json({ error: "COMPANY_CONTEXT_REQUIRED" });
        return;
    }
    const from = parseDate(request.query.from);
    const to = parseDate(request.query.to);
    const events = await listCompanyObservabilityEvents({
        companyId,
        executionId: typeof request.query.executionId === "string" ? request.query.executionId : undefined,
        workflowId: typeof request.query.workflowId === "string" ? request.query.workflowId : undefined,
        eventType: typeof request.query.eventType === "string" ? request.query.eventType : undefined,
        severity: typeof request.query.severity === "string" && ["INFO", "WARN", "ERROR"].includes(request.query.severity)
            ? request.query.severity as "INFO" | "WARN" | "ERROR" : undefined,
        from,
        to,
        limit: typeof request.query.limit === "string" ? Number(request.query.limit) : undefined,
    });
    response.json({ events });
}

export async function getObservabilityTrace(request: Request, response: Response): Promise<void> {
    const companyId = companyIdOf(response);
    const executionId = typeof request.params.executionId === "string" ? request.params.executionId : "";
    if (!companyId) {
        response.status(403).json({ error: "COMPANY_CONTEXT_REQUIRED" });
        return;
    }
    if (!executionId) {
        response.status(400).json({ error: "EXECUTION_ID_REQUIRED" });
        return;
    }
    const events = await listCompanyObservabilityEvents({
        companyId,
        executionId,
        limit: 500,
    });
    response.json({
        executionId,
        events: [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()),
    });
}

export async function getObservabilitySummary(request: Request, response: Response): Promise<void> {
    const companyId = companyIdOf(response);
    if (!companyId) {
        response.status(403).json({ error: "COMPANY_CONTEXT_REQUIRED" });
        return;
    }
    const to = parseDate(request.query.to) ?? new Date();
    const from = parseDate(request.query.from) ?? new Date(to.getTime() - 24 * 60 * 60 * 1000);
    if (from > to) {
        response.status(400).json({ error: "INVALID_TIME_RANGE" });
        return;
    }
    response.json(await getCompanyObservabilitySummary(companyId, from, to));
}

export async function getObservabilityDashboard(request: Request, response: Response): Promise<void> {
    const companyId = companyIdOf(response);
    if (!companyId) {
        response.status(403).json({ error: "COMPANY_CONTEXT_REQUIRED" });
        return;
    }
    const to = parseDate(request.query.to) ?? new Date();
    const from = parseDate(request.query.from) ?? new Date(to.getTime() - 24 * 60 * 60 * 1000);
    if (from > to) {
        response.status(400).json({ error: "INVALID_TIME_RANGE" });
        return;
    }

    const [dashboard, alerts, recentEventCandidates] = await Promise.all([
        getCompanyObservabilityDashboard(companyId, from, to),
        evaluateCompanyObservabilityAlerts(companyId, to),
        listCompanyObservabilityEvents({
            companyId,
            from,
            to,
            limit: 50,
        }),
    ]);

    const recentEvents = recentEventCandidates
        .filter((event) => {
            if (event.eventType !== "http.request.completed") return true;

            // 304 responses are cache/polling noise for the operator activity feed.
            // They remain counted in request/latency metrics, but should not crowd
            // out meaningful backend execution/provider/security events.
            if (event.status === "304") return false;

            const metadata = event.metadata;
            if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return true;
            return (metadata as Record<string, unknown>).route !== "/api/v1/observability/dashboard";
        })
        .slice(0, 12);

    response.json({
        ...dashboard,
        alerts,
        recentEvents,
    });
}
