import type { NextFunction, Request, Response } from "express";

import { getMembership, getSession } from "./auth.service";
import type { MembershipRole } from "./auth.service";

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

export async function requireAuthentication(
    request: Request,
    response: Response,
    next: NextFunction,
): Promise<void> {
    const token = sessionToken(request);

    if (token) {
        const session = await getSession(token);
        if (!session) {
            response.status(401).json({ error: "UNAUTHORIZED" });
            return;
        }

        const requestedCompanyId = request.header("x-luuku-company-id")?.trim();
        const membership = await getMembership(session.userId, requestedCompanyId);

        if (!membership) {
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

    response.status(401).json({ error: "UNAUTHORIZED" });
}

export function requirePermission(
    permission: "read" | "operate" | "admin",
) {
    return (_request: Request, response: Response, next: NextFunction): void => {
        const context = response.locals.apiRequestContext as AuthenticatedContext | undefined;
        if (!context) {
            response.status(401).json({ error: "UNAUTHORIZED" });
            return;
        }

        const allowed: Record<string, string[]> = {
            read: ["VIEWER", "OPERATOR", "ADMIN", "OWNER", "SERVICE"],
            operate: ["OPERATOR", "ADMIN", "OWNER", "SERVICE"],
            admin: ["ADMIN", "OWNER", "SERVICE"],
        };

        if (!allowed[permission].includes(context.role)) {
            response.status(403).json({ error: "FORBIDDEN" });
            return;
        }

        next();
    };
}

export function requireServiceRole(
    _request: Request,
    response: Response,
    next: NextFunction,
): void {
    const context = response.locals.apiRequestContext as AuthenticatedContext | undefined;
    if (context?.role !== "SERVICE") {
        response.status(403).json({ error: "SERVICE_SCOPE_REQUIRED" });
        return;
    }
    next();
}
