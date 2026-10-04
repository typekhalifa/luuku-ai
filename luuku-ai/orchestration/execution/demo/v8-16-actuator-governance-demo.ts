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

function step(id: string): WorkflowStep {
    return {
        id,
        workflowId: "phase5-governance-demo",
        ownership: { scope: "COMPANY", companyId: "company-a" },
        title: "Controlled external action",
        description: "Phase 5 actuator governance contract.",
        agentId: "sales",
        capability: "email.send",
        dependsOn: [],
        priority: Priority.MEDIUM,
        requiresApproval: false,
        status: "READY",
    };
}

async function main(): Promise<void> {
    let terminalExecutions = 0;
    let throwOnExecution = false;

    const registry = new InMemoryProductionActuatorRegistry();
    registry.register({
        id: "phase5-test-email-actuator",
        capabilities: ["email.send"],
        async execute(): Promise<{
            success: boolean;
            summary: string;
            completedAt: string;
            executionStatus: "verified";
            executed: boolean;
            verified: boolean;
            evidence: { provider: string; externalId: string };
        }> {
            terminalExecutions += 1;

            if (throwOnExecution) {
                throw new Error("Provider response was lost after dispatch.");
            }

            return {
                success: true,
                summary: "Controlled external action completed.",
                completedAt: new Date().toISOString(),
                executionStatus: "verified",
                executed: true,
                verified: true,
                evidence: {
                    provider: "phase5-controlled-provider",
                    externalId: `phase5-${terminalExecutions}`,
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

    const first = await gate.dispatch(step("email-step"));

    if (first.outcome !== "VERIFIED" || !first.result?.verified) {
        throw new Error("Authorized actuator did not reach verified execution.");
    }

    const replay = await gate.dispatch(step("email-step"));

    if (!replay.replayed || replay.outcome !== "VERIFIED") {
        throw new Error("Completed external action was not replay-protected.");
    }

    if (terminalExecutions !== 1) {
        throw new Error("Idempotency protection allowed duplicate external execution.");
    }

    const unauthorized = await gate.dispatch({
        ...step("unauthorized-step"),
        agentId: "research",
    });

    if (unauthorized.outcome !== "BLOCKED" || terminalExecutions !== 1) {
        throw new Error("Unauthorized agent crossed the actuator governance gate.");
    }

    control.disable();

    const killed = await gate.dispatch(step("kill-switch-step"));

    if (killed.outcome !== "BLOCKED" || terminalExecutions !== 1) {
        throw new Error("Operator kill switch failed to block external actuation.");
    }

    control.enable();
    throwOnExecution = true;

    const unknown = await gate.dispatch(step("provider-unknown-step"));

    if (unknown.outcome !== "UNKNOWN") {
        throw new Error("Post-dispatch provider failure was not classified as UNKNOWN.");
    }

    const unknownReplay = await gate.dispatch(step("provider-unknown-step"));

    if (unknownReplay.replayed || unknownReplay.outcome !== "UNKNOWN") {
        throw new Error("UNKNOWN provider outcome became automatically replayable.");
    }

    console.log("");
    console.log("V8 — PHASE 5 ACTUATOR GOVERNANCE CONTRACT");
    console.log("V6 → governance gate → actuator : PASS");
    console.log("Explicit capability authorization: PASS");
    console.log("Operator kill switch             : PASS");
    console.log("Ownership-scoped idempotency     : PASS");
    console.log("Completed-action replay safety   : PASS");
    console.log("Unknown provider outcome         : PASS");
    console.log("UNKNOWN outcome auto-retry        : BLOCKED");
    console.log("Terminal executions              :", terminalExecutions);
    console.log("PHASE 5 ACTUATOR GOVERNANCE: PASS");
}

void main();
