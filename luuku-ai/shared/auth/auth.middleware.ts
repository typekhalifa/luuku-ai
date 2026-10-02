import type { NextFunction, Request, Response } from "express";

import { getMembership, getSession } from "./auth.service";
import type { MembershipRole } from "./auth.service";
import { recordObservabilityEvent } from "../observability/durable-events.js";

export interface AuthenticatedContext {
    companyId: string;
    authMethod: "api-key" | "session";
    userId?: string;
    role: MembershipRole | "SERVICE";
}

function sessionToken(request: Request): string | undefined {
    const raw = request.header("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("luuku_session="));
    return raw?.slice("luuku_session=".length) || undefined;
}

function recordSecurityEvent(
    request: Request,
    response: Response,
    eventType: "security.authentication_failure" | "security.tenant_violation" | "security.authorization_failure",
    status: string,
    metadata: Record<string, unknown> = {},
    ownership?: { scope: "COMPANY"; companyId: string },
): void {
    void recordObservabilityEvent({
        eventType,
        source: "auth.middleware",
        ownership: ownership ?? { scope: "SYSTEM" },
        requestId: (response.locals.observabilityCorrelation as { requestId?: string } | undefined)?.requestId,
        traceId: (response.locals.observabilityCorrelation as { traceId?: string } | undefined)?.traceId,
        severity: "ERROR",
        status,
        actorType: "USER",
        metadata,
    }).catch(() => {
        // Security telemetry must never turn an auth decision into a server error.
    });
}

export async function requireAuthentication(
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> {
    const token = sessionToken(request);

    if (token) {
        const session = await getSession(token);
        if (!session) {
            recordSecurityEvent(request, response, "security.authentication_failure", "401", {
                reason: "invalid_or_expired_session",
            });
            response.status(401).json({ error: "UNAUTHORIZED" });
            return;
        }

        const requestedCompanyId = request.header("x-luuku-company-id")?.trim();
        const membership = await getMembership(session.userId, requestedCompanyId);

        if (!membership) {
            recordSecurityEvent(request, response, "security.tenant_violation", "403", {
                reason: "company_membership_missing",
                requestedCompanyId: requestedCompanyId || null,
                userId: session.userId,
            });
            response.status(403).json({ error: "COMPANY_ACCESS_FORBIDDEN" });
            return;
        }

        response.locals.apiRequestContext = {
            companyId: membership.companyId,
            authMethod: "session",
            userId: session.userId,
            role: membership.role,
        } satisfies AuthenticatedContext;

        next();
        return;
    }

    recordSecurityEvent(request, response, "security.authentication_failure", "401", {
        reason: "session_missing",
    });
    response.status(401).json({ error: "UNAUTHORIZED" });
}

export function requirePermission(
    permission: "read" | "operate" | "admin",
) {
    return (request: Request, response: Response, next: NextFunction): void => {
        const context = response.locals.apiRequestContext as AuthenticatedContext | undefined;
        if (!context) {
            recordSecurityEvent(request, response, "security.authentication_failure", "401", {
                reason: "authenticated_context_missing",
                permission,
            });
            response.status(401).json({ error: "UNAUTHORIZED" });
            return;
        }

        const allowed: Record<string, string[]> = {
            read: ["VIEWER", "OPERATOR", "ADMIN", "OWNER", "SERVICE"],
            operate: ["OPERATOR", "ADMIN", "OWNER", "SERVICE"],
            admin: ["ADMIN", "OWNER", "SERVICE"],
        };

        if (!allowed[permission].includes(context.role)) {
            recordSecurityEvent(request, response, "security.authorization_failure", "403", {
                reason: "insufficient_role",
                permission,
                role: context.role,
            }, { scope: "COMPANY", companyId: context.companyId });
            response.status(403).json({ error: "FORBIDDEN" });
            return;
        }

        next();
    };
}

export function requireServiceRole(
    request: Request,
    response: Response,
    next: NextFunction,
): void {
    const context = response.locals.apiRequestContext as AuthenticatedContext | undefined;
    if (context?.role !== "SERVICE") {
        if (context?.companyId) {
            recordSecurityEvent(request, response, "security.authorization_failure", "403", {
                reason: "service_scope_required",
                role: context.role ?? null,
            }, { scope: "COMPANY", companyId: context.companyId });
        } else {
            recordSecurityEvent(request, response, "security.authorization_failure", "403", {
                reason: "service_scope_required",
            });
        }
        response.status(403).json({ error: "SERVICE_SCOPE_REQUIRED" });
        return;
    }
    next();
}
