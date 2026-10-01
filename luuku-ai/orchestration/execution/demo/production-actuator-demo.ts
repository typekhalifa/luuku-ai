import type { AgentResult } from "../../../shared/agents/interface.js";
import type { WorkflowStep } from "../../workflow/workflow-step.js";
import { Priority } from "../../task/priority.js";
import {
    InMemoryProductionActuatorRegistry,
    ProductionActuatorComposition,
    type ProductionActuator,
} from "../production-actuator.js";

const completed: AgentResult = {
    success: true,
    summary: "Production actuator executed through V6.",
    completedAt: "2026-09-18T00:00:00.000Z",
    executionStatus: "completed",
    executed: true,
    verified: true,
};

const step: WorkflowStep = {
    id: "production-actuator-demo-step",
    workflowId: "production-actuator-demo-workflow",
    title: "Send approved email",
    description: "Dispatch email.send through the production actuator.",
    agentId: "sales",
    capability: "email.send",
    dependsOn: [],
    status: "READY",
    requiresApproval: false,
    priority: Priority.MEDIUM,
};

const emailActuator: ProductionActuator = {
    id: "communication-email",
    capabilities: ["email.send"],
    async execute(authorizedStep) {
        if (authorizedStep.capability !== "email.send") {
            throw new Error("Unexpected capability reached email actuator.");
        }
        return completed;
    },
};

async function main(): Promise<void> {
    const registry = new InMemoryProductionActuatorRegistry();
    registry.register(emailActuator);

    const composition = new ProductionActuatorComposition(registry);

    const result = await composition.dispatch(step);

    if (!result.allowed || result.actuatorId !== "communication-email") {
        throw new Error("Production actuator dispatch failed.");
    }

    if (result.boundary !== "V6_EXECUTION_AUTHORITY") {
        throw new Error("Production actuator bypassed the V6 boundary.");
    }

    if (!result.result?.executed || !result.result.verified) {
        throw new Error("Production actuator did not return verified execution evidence.");
    }

    const missingCapability = await composition.dispatch({
        ...step,
        id: "missing-capability-step",
        capability: "calendar.schedule",
    });

    if (missingCapability.allowed) {
        throw new Error("Unregistered capability was dispatched.");
    }

    const approvalBlocked = await composition.dispatch({
        ...step,
        id: "approval-required-step",
        requiresApproval: true,
    });

    if (approvalBlocked.allowed) {
        throw new Error("Production actuator bypassed workflow approval.");
    }

    console.log("");
    console.log("V8 — PRODUCTION ACTUATOR COMPOSITION VALIDATION");
    console.log("Registered actuator       :", emailActuator.id);
    console.log("Resolved capability      :", step.capability);
    console.log("V6 boundary              :", result.boundary);
    console.log("Execution verified       :", result.result?.verified ? "YES" : "NO");
    console.log("✓ Capability resolves to a single production actuator");
    console.log("✓ Dispatch crosses the V6 actuation boundary");
    console.log("✓ Authorized capability is re-checked before actuator execution");
    console.log("✓ Unregistered capabilities are blocked");
    console.log("✓ Approval-required steps are blocked by V6");
    console.log("V8 PRODUCTION ACTUATOR: PASS");
}

void main();
