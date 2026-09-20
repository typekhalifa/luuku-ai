import type { MembershipRole } from "../auth/auth.service";

export interface ApiRequestContext {
    companyId: string;
    authMethod: "api-key" | "session";
    userId?: string;
    role: MembershipRole | "SERVICE";
}

export function getApiRequestContext(
    locals: Record<string, unknown>,
): ApiRequestContext {
    const context = locals.apiRequestContext;

    if (
        !context ||
        typeof context !== "object" ||
        typeof (context as { companyId?: unknown }).companyId !== "string"
    ) {
        throw new Error("Authenticated API request context is missing.");
    }

    return context as ApiRequestContext;
}
