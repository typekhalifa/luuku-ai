import {
    CapabilityAgentAuthorizationPolicy,
    GuardedProductionActuation,
    InMemoryActuationIdempotencyStore,
    StaticActuationControl,
    buildActuationIdempotencyKey,
} from "../production-actuation-governance.js";
import {
    InMemoryProductionActuatorRegistry,
    ProductionActuatorComposition,
} from "../production-actuator.js";
import { Priority } from "../../task/priority.js";
import type { WorkflowStep } from "../../workflow/workflow-step.js";

function step(
    companyId: string,
    id = "tenant-isolation-step",
): WorkflowStep {
    return {
        id,
        workflowId: "phase5-cross-tenant-attack",
        ownership: {
            scope: "COMPANY",
            companyId,
        },
        title: "Cross-tenant controlled external action",
        description: "Phase 5.4-B cross-tenant actuation isolation attack.",
        agentId: "sales",
        capability: "email.send",
        dependsOn: [],
        priority: Priority.MEDIUM,
        requiresApproval: false,
        status: "READY",
    };
}

async function main(): Promise<void> {
    const executionIds: string[] = [];

    const registry = new InMemoryProductionActuatorRegistry();

    registry.register({
        id: "phase5-cross-tenant-test-actuator",
        capabilities: ["email.send"],

        async execute(currentStep): Promise<{
            success: boolean;
            summary: string;
            completedAt: string;
            executionStatus: "verified";
            executed: boolean;
            verified: boolean;
            evidence: {
                provider: string;
                externalId: string;
            };
        }> {
            const companyId = currentStep.ownership?.scope === "COMPANY"
                ? currentStep.ownership.companyId
                : "unknown";
            const externalId = `phase5-cross-tenant-${companyId}-${executionIds.length + 1}`;

            executionIds.push(externalId);

            return {
                success: true,
                summary: `Controlled external action completed for ${companyId}.`,
                completedAt: new Date().toISOString(),
                executionStatus: "verified",
                executed: true,
                verified: true,
                evidence: {
                    provider: "phase5-cross-tenant-test-provider",
                    externalId,
                },
            };
        },
    });

    const composition = new ProductionActuatorComposition(registry);

    const authorization = new CapabilityAgentAuthorizationPolicy(
        new Map([
            ["email.send", new Set(["sales"])],
        ]),
    );

    const control = new StaticActuationControl(true);
    const store = new InMemoryActuationIdempotencyStore();

    const gate = new GuardedProductionActuation(
        composition,
        authorization,
        control,
        store,
    );

    const tenantA = step("company-a");
    const tenantB = step("company-b");

    const keyA = buildActuationIdempotencyKey(tenantA);
    const keyB = buildActuationIdempotencyKey(tenantB);

    console.log("========================================");
    console.log("   PHASE 5.4-B CROSS-TENANT ISOLATION");
    console.log("========================================");
    console.log("");

    console.log(`Tenant A idempotency key   : ${keyA}`);
    console.log(`Tenant B idempotency key   : ${keyB}`);

    if (keyA === keyB) {
        throw new Error(
            "CROSS-TENANT ATTACK DETECTED: tenant ownership collapsed into the same idempotency key.",
        );
    }

    const firstA = await gate.dispatch(tenantA);
    const firstB = await gate.dispatch(tenantB);

    console.log(`Tenant A first outcome     : ${firstA.outcome}`);
    console.log(`Tenant A external ID       : ${firstA.result?.evidence?.externalId ?? "<none>"}`);
    console.log(`Tenant B first outcome     : ${firstB.outcome}`);
    console.log(`Tenant B external ID       : ${firstB.result?.evidence?.externalId ?? "<none>"}`);

    if (firstA.outcome !== "VERIFIED" || firstB.outcome !== "VERIFIED") {
        throw new Error("Expected both tenants to complete their independent actions.");
    }

    if (firstA.result?.evidence?.externalId === firstB.result?.evidence?.externalId) {
        throw new Error(
            "CROSS-TENANT ATTACK DETECTED: independent tenants received the same external result.",
        );
    }

    const replayA = await gate.dispatch(tenantA);
    const replayB = await gate.dispatch(tenantB);

    console.log(`Tenant A replay outcome     : ${replayA.outcome}`);
    console.log(`Tenant A replayed           : ${replayA.replayed ?? false}`);
    console.log(`Tenant B replay outcome     : ${replayB.outcome}`);
    console.log(`Tenant B replayed           : ${replayB.replayed ?? false}`);

    if (
        replayA.outcome !== "VERIFIED" ||
        !replayA.replayed ||
        replayB.outcome !== "VERIFIED" ||
        !replayB.replayed
    ) {
        throw new Error(
            "Tenant-local replay did not recover each tenant's own completed result.",
        );
    }

    if (replayA.result?.evidence?.externalId !== firstA.result?.evidence?.externalId) {
        throw new Error(
            "CROSS-TENANT ATTACK DETECTED: Tenant A replay recovered a different result.",
        );
    }

    if (replayB.result?.evidence?.externalId !== firstB.result?.evidence?.externalId) {
        throw new Error(
            "CROSS-TENANT ATTACK DETECTED: Tenant B replay recovered a different result.",
        );
    }

    if (executionIds.length !== 2) {
        throw new Error(
            `CROSS-TENANT ATTACK DETECTED: expected exactly 2 independent executions, received ${executionIds.length}.`,
        );
    }

    if (executionIds.includes(firstA.result?.evidence?.externalId ?? "")) {
        // This condition is intentionally checked through exact tenant IDs below.
    }

    if (
        !firstA.result?.evidence?.externalId?.includes("company-a") ||
        !firstB.result?.evidence?.externalId?.includes("company-b")
    ) {
        throw new Error(
            "CROSS-TENANT ATTACK DETECTED: actuator execution lost tenant ownership.",
        );
    }

    console.log("");
    console.log("========================================");
    console.log("PHASE 5.4-B CROSS-TENANT ISOLATION: PASS");
    console.log("========================================");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
