import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";

import { prisma } from "../../database/client";
import { createUser, login } from "../../auth/auth.service";
import {
    requireAuthentication,
    type AuthenticatedContext,
} from "../../auth/auth.middleware";

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`API TENANT AUTHORIZATION ASSERTION FAILED: ${message}`);
    }
}

function makeCompany(id: string, name: string) {
    return {
        id,
        name,
        industry: "Testing",
        country: "Rwanda",
        city: "Kigali",
        size: "small" as const,
        status: "prospect" as const,
        confidence: 100,
        verified: true,
        source: "V8 API Tenant Authorization Test",
    };
}

function makeRequest(requestedCompanyId?: string): Request {
    return {
        header(name: string): string | undefined {
            if (name.toLowerCase() === "x-luuku-company-id") {
                return requestedCompanyId;
            }
            return undefined;
        },
    } as Request;
}

async function invokeAuthentication(
    request: Request,
): Promise<{
    nextCalled: boolean;
    statusCode?: number;
    body?: unknown;
    context?: AuthenticatedContext;
}> {
    const response = {
        locals: {},
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(body: unknown) {
            this.body = body;
            return this;
        },
        statusCode: undefined as number | undefined,
        body: undefined as unknown,
    } as unknown as Response & {
        locals: Record<string, unknown>;
        statusCode?: number;
        body?: unknown;
    };

    let nextCalled = false;
    const next: NextFunction = () => {
        nextCalled = true;
    };

    await requireAuthentication(request, originalResponse, next);

    return {
        nextCalled,
        statusCode: response.statusCode,
        body: response.body,
        context: response.locals.apiRequestContext as AuthenticatedContext | undefined,
    };
}

async function main(): Promise<void> {
    const companyAId = crypto.randomUUID();
    const companyBId = crypto.randomUUID();
    const email = `v8-api-tenant-${crypto.randomUUID()}@example.test`;
    const password = "V8-tenant-boundary-password-123!";

    console.log("");
    console.log("==============================================");
    console.log(" V8 API → AUTH → TENANT CONTEXT REGRESSION");
    console.log("==============================================");
    console.log("");

    try {
        await prisma.company.create({ data: makeCompany(companyAId, "API Tenant A") });
        await prisma.company.create({ data: makeCompany(companyBId, "API Tenant B") });

        const user = await createUser({
            email,
            name: "V8 Tenant Boundary Test",
            password,
            companyId: companyAId,
            role: "OWNER",
        });

        const authenticated = await login(email, password);
        assert(authenticated !== null, "test user can authenticate");
        assert(authenticated!.user.id === user.id, "session belongs to the authenticated user");

        const validRequest = makeRequest(companyAId);
        validRequest.header = (name: string) =>
            name.toLowerCase() === "cookie"
                ? `luuku_session=${authenticated!.token}`
                : name.toLowerCase() === "x-luuku-company-id"
                    ? companyAId
                    : undefined;

        const validResult = await invokeAuthentication(validRequest);
        assert(validResult.nextCalled, "authorized company membership reaches the API");
        assert(validResult.context?.companyId === companyAId, "API context is bound to company A");
        assert(validResult.context?.userId === user.id, "API context is bound to the authenticated user");

        const attackRequest = makeRequest(companyBId);
        attackRequest.header = (name: string) =>
            name.toLowerCase() === "cookie"
                ? `luuku_session=${authenticated!.token}`
                : name.toLowerCase() === "x-luuku-company-id"
                    ? companyBId
                    : undefined;

        const attackResult = await invokeAuthentication(attackRequest);
        assert(!attackResult.nextCalled, "company A user cannot select company B");
        assert(attackResult.statusCode === 403, "cross-tenant company selection is rejected");
        assert(attackResult.body === undefined || (attackResult.body as { error?: string }).error === "COMPANY_ACCESS_FORBIDDEN",
            "cross-tenant rejection uses the authorization boundary");

        const implicitRequest = makeRequest();
        implicitRequest.header = (name: string) =>
            name.toLowerCase() === "cookie"
                ? `luuku_session=${authenticated!.token}`
                : undefined;

        const implicitResult = await invokeAuthentication(implicitRequest);
        assert(implicitResult.nextCalled, "authenticated user without selector still reaches the API");
        assert(implicitResult.context?.companyId === companyAId,
            "missing selector resolves only to the user's membership, never arbitrary tenant input");

        console.log("✓ Authenticated Company A user receives Company A context");
        console.log("✓ Authenticated user identity is preserved in API context");
        console.log("✓ Company A user cannot select Company B via tenant header");
        console.log("✓ Cross-tenant selection fails with 403");
        console.log("✓ Missing tenant selector does not create arbitrary tenant context");
        console.log("");
        console.log("V8 API TENANT AUTHORIZATION: PASS");
    } finally {
        await prisma.user.deleteMany({ where: { email } });
        await prisma.company.deleteMany({
            where: { id: { in: [companyAId, companyBId] } },
        });
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
