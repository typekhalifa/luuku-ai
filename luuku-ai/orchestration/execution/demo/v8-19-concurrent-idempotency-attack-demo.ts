import {
    CapabilityAgentAuthorizationPolicy,
    GuardedProductionActuation,
    InMemoryActuationIdempotencyStore,
    StaticActuationControl,
} from "../production-actuation-governance.js";
import {
    InMemoryProductionActuatorRegistry,
    ProductionActuatorComposition,
} from "../production-actuator.js";
import { Priority } from "../../task/priority.js";
import type { WorkflowStep } from "../../workflow/workflow-step.js";

function step(id = "concurrent-email-step"): WorkflowStep {
    return {
        id,
        workflowId: "phase5-concurrency-attack",
        ownership: {
            scope: "COMPANY",
            companyId: "company-a",
        },
        title: "Concurrent controlled external action",
        description: "Phase 5.4-A concurrent idempotency attack.",
        agentId: "sales",
        capability: "email.send",
        dependsOn: [],
        priority: Priority.MEDIUM,
        requiresApproval: false,
        status: "READY",
    };
}

function deferred(): {
    promise: Promise<void>;
    resolve: () => void;
} {
    let resolve!: () => void;

    const promise = new Promise<void>(resolver => {
        resolve = resolver;
    });

    return { promise, resolve };
}

async function main(): Promise<void> {
    let actuatorExecutions = 0;

    const providerEntered = deferred();
    const releaseProvider = deferred();

    const registry = new InMemoryProductionActuatorRegistry();

    registry.register({
        id: "phase5-concurrency-test-actuator",
        capabilities: ["email.send"],

        async execute(): Promise<{
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
            actuatorExecutions += 1;

            providerEntered.resolve();

            // Hold the first execution open so a second concurrent
            // dispatch definitely reaches the idempotency boundary
            // before the first execution completes.
            await releaseProvider.promise;

            return {
                success: true,
                summary: "Controlled concurrent external action completed.",
                completedAt: new Date().toISOString(),
                executionStatus: "verified",
                executed: true,
                verified: true,
                evidence: {
                    provider: "phase5-concurrency-test-provider",
                    externalId: `phase5-concurrent-${actuatorExecutions}`,
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

    console.log("========================================");
    console.log("   PHASE 5.4-A CONCURRENT IDEMPOTENCY");
    console.log("========================================");
    console.log("");

    const firstPromise = gate.dispatch(step());

    // Wait until request A has actually crossed into the actuator.
    await providerEntered.promise;

    // Request B now arrives while request A is still executing.
    const secondPromise = gate.dispatch(step());

    // Give B a chance to reach the same idempotency lookup before
    // releasing A. This intentionally exposes a non-atomic get/put.
    await Promise.resolve();
    await Promise.resolve();

    releaseProvider.resolve();

    const [first, second] = await Promise.all([
        firstPromise,
        secondPromise,
    ]);

    console.log(`Concurrent dispatches        : 2`);
    console.log(`Actuator executions          : ${actuatorExecutions}`);
    console.log(`First outcome                : ${first.outcome}`);
    console.log(`Second outcome               : ${second.outcome}`);
    console.log(`First replayed               : ${first.replayed ?? false}`);
    console.log(`Second replayed              : ${second.replayed ?? false}`);
    console.log(
        `First external ID            : ${first.result?.evidence?.externalId ?? "<none>"}`,
    );
    console.log(
        `Second external ID           : ${second.result?.evidence?.externalId ?? "<none>"}`,
    );
    console.log("");

    if (first.outcome !== "VERIFIED") {
        throw new Error(
            `Expected first concurrent dispatch to be VERIFIED; received ${first.outcome}.`,
        );
    }

    if (second.outcome !== "VERIFIED" || !second.replayed) {
        throw new Error(
            "Concurrent loser did not recover the winner's verified result as a replay.",
        );
    }

    if (actuatorExecutions !== 1) {
        throw new Error(
            `CONCURRENCY ATTACK DETECTED: expected exactly 1 actuator execution, received ${actuatorExecutions}.`,
        );
    }

    if (first.result?.evidence?.externalId !== second.result?.evidence?.externalId) {
        throw new Error(
            "CONCURRENCY ATTACK DETECTED: concurrent requests produced different external IDs.",
        );
    }

    console.log("========================================");
    console.log("PHASE 5.4-A CONCURRENT IDEMPOTENCY: PASS");
    console.log("========================================");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
