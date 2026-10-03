import assert from "node:assert/strict";
import { prisma } from "../../../shared/database/client.js";
import { AgentResult } from "../../../shared/agents/interface.js";
import { recordObservabilityEvent, listCompanyObservabilityEvents, getCompanyObservabilityDashboard, listSystemSecurityEvents } from "../durable-events.js";
import { evaluateCompanyObservabilityAlerts, evaluateSystemSecurityAlerts } from "../alerts.js";
import { ExecutionLedger } from "../../../orchestration/execution/execution-ledger.js";

const source = "v8.12-runtime-observability-attack";

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitFor(check: () => Promise<boolean>, timeoutMs = 5000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await check()) return;
        await sleep(100);
    }
    throw new Error("Timed out waiting for durable observability evidence.");
}

function result(success: boolean, provider: string, externalId: string): AgentResult {
    return {
        success,
        summary: success ? "Controlled runtime execution verified." : "Controlled runtime provider failure.",
        completedAt: new Date().toISOString(),
        executionStatus: success ? "verified" : "failed",
        executed: success,
        verified: success,
        evidence: { provider, externalId },
    };
}

async function main(): Promise<void> {
    const suffix = Date.now().toString();
    const companyA = await prisma.company.create({
        data: {
            name: `V8.12 Runtime Attack A ${suffix}`,
            industry: "test",
            country: "Rwanda",
            status: "prospect",
            confidence: 100,
            verified: false,
            source: "v8.12-runtime-attack",
        },
    });
    const companyB = await prisma.company.create({
        data: {
            name: `V8.12 Runtime Attack B ${suffix}`,
            industry: "test",
            country: "Rwanda",
            status: "prospect",
            confidence: 100,
            verified: false,
            source: "v8.12-runtime-attack",
        },
    });

    const ledger = new ExecutionLedger();
    const executionIds: string[] = [];

    try {
        const successWorkflow = `v8.12-success-${suffix}`;
        const successStep = "send-controlled-success";
        const successKey = `luuku:v8.12:${successWorkflow}:${successStep}`;
        const successClaim = await ledger.begin(successKey, successWorkflow, successStep, {
            scope: "COMPANY",
            companyId: companyA.id,
        });
        assert.equal(successClaim.status, "new");
        executionIds.push(successClaim.id);
        await ledger.complete(successKey, result(true, "attack-provider", `success-${suffix}`));

        const failedWorkflow = `v8.12-failure-${suffix}`;
        const failedStep = "send-controlled-failure";
        const failedKey = `luuku:v8.12:${failedWorkflow}:${failedStep}`;
        const failedClaim = await ledger.begin(failedKey, failedWorkflow, failedStep, {
            scope: "COMPANY",
            companyId: companyA.id,
        });
        assert.equal(failedClaim.status, "new");
        executionIds.push(failedClaim.id);
        await ledger.complete(failedKey, result(false, "attack-provider", `failed-${suffix}`));

        await waitFor(async () => {
            const events = await listCompanyObservabilityEvents({
                companyId: companyA.id,
                from: new Date(Date.now() - 60_000),
                to: new Date(),
                limit: 100,
            });
            return events.filter(event => executionIds.includes(event.executionId ?? "")).length >= 6;
        });

        const dashboard = await getCompanyObservabilityDashboard(
            companyA.id,
            new Date(Date.now() - 60_000),
            new Date(),
        );
        assert.equal(dashboard.executions.started, 2);
        assert.equal(dashboard.executions.succeeded, 1);
        assert.equal(dashboard.executions.failed, 1);
        assert.equal(dashboard.providers.succeeded, 1);
        assert.equal(dashboard.providers.failed, 1);

        const trace = await listCompanyObservabilityEvents({
            companyId: companyA.id,
            executionId: successClaim.id,
            limit: 100,
        });
        assert.deepEqual(
            trace.map(event => event.eventType).sort(),
            ["execution.started", "execution.succeeded", "provider.succeeded"].sort(),
        );

        const crossTenantTrace = await listCompanyObservabilityEvents({
            companyId: companyB.id,
            executionId: successClaim.id,
            limit: 100,
        });
        assert.equal(crossTenantTrace.length, 0);

        for (let index = 0; index < 5; index += 1) {
            await recordObservabilityEvent({
                eventType: "http.request.completed",
                source,
                ownership: { scope: "COMPANY", companyId: companyA.id },
                severity: "ERROR",
                status: "500",
                metadata: { durationMs: 10 + index, route: "/v8.12/controlled-failure" },
            });
        }

        await recordObservabilityEvent({
            eventType: "security.authorization_failure",
            source,
            ownership: { scope: "COMPANY", companyId: companyA.id },
            severity: "ERROR",
            status: "403",
        });

        await recordObservabilityEvent({
            eventType: "security.authentication_failure",
            source,
            ownership: { scope: "SYSTEM" },
            severity: "ERROR",
            status: "401",
        });

        const companyAlerts = await evaluateCompanyObservabilityAlerts(companyA.id, new Date(), {
            http5xxCount: 5,
            providerFailureCount: 1,
            securityViolationCount: 1,
            executionFailureCount: 1,
        });
        assert.ok(companyAlerts.some(alert => alert.code === "HTTP_5XX_SPIKE"));
        assert.ok(companyAlerts.some(alert => alert.code === "PROVIDER_FAILURE_SPIKE"));
        assert.ok(companyAlerts.some(alert => alert.code === "SECURITY_VIOLATION"));
        assert.ok(companyAlerts.some(alert => alert.code === "EXECUTION_FAILURE_SPIKE"));

        const systemAlerts = await evaluateSystemSecurityAlerts(new Date(), {
            securityViolationCount: 1,
        });
        assert.ok(systemAlerts.some(alert => alert.code === "SYSTEM_SECURITY_VIOLATION"));

        const systemEvents = await listSystemSecurityEvents(
            new Date(Date.now() - 60_000),
            new Date(),
        );
        assert.ok(systemEvents.some(event => event.source === source));

        console.log("");
        console.log("========================================");
        console.log(" V8.12 RUNTIME OBSERVABILITY ATTACK");
        console.log("========================================");
        console.log("");
        console.log("Successful execution     : PASS");
        console.log("Failed execution         : PASS");
        console.log("Provider lifecycle       : PASS");
        console.log("Execution trace          : PASS");
        console.log("Cross-tenant trace       : PASS");
        console.log("HTTP 5xx alert           : PASS");
        console.log("Provider failure alert   : PASS");
        console.log("Execution failure alert  : PASS");
        console.log("Company security alert   : PASS");
        console.log("System security alert    : PASS");
        console.log("");
        console.log("V8.12 RUNTIME OBSERVABILITY ATTACK: PASS");
    } finally {
        await prisma.observabilityEvent.deleteMany({
            where: {
                source,
            },
        });
        if (executionIds.length > 0) {
            await prisma.observabilityEvent.deleteMany({
                where: { executionId: { in: executionIds } },
            });
            await prisma.communicationExecution.deleteMany({
                where: { id: { in: executionIds } },
            });
        }
        await prisma.company.deleteMany({
            where: { id: { in: [companyA.id, companyB.id] } },
        });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
