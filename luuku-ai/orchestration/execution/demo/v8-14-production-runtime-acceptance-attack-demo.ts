import assert from "node:assert/strict";

import type { AgentResult } from "../../../shared/agents/interface.js";
import { Priority } from "../../task/priority.js";
import { WorkflowOrchestrator } from "../../workflow/workflow-orchestrator.js";
import type { Workflow } from "../../workflow/workflow.js";
import { WorkflowStatus } from "../../workflow/workflow-status.js";
import type { WorkflowStep } from "../../workflow/workflow-step.js";
import {
    InMemoryProductionActuatorRegistry,
    ProductionActuatorComposition,
} from "../production-actuator.js";

const executed: string[] = [];

const registry = new InMemoryProductionActuatorRegistry();
registry.register({
    id: "runtime-acceptance-controlled-actuator",
    capabilities: ["email.send"],
    async execute(step): Promise<AgentResult> {
        executed.push(step.id);
        return {
            success: true,
            summary: "Controlled actuator reached through the V6 boundary.",
            completedAt: new Date().toISOString(),
            executionStatus: "verified",
            executed: true,
            verified: true,
            evidence: {
                provider: "runtime-acceptance-controlled",
                externalId: `controlled-${step.id}`,
            },
        };
    },
});

const composition = new ProductionActuatorComposition(registry);
const orchestrator = new WorkflowOrchestrator(undefined, {
    async execute(step) {
        const dispatch = await composition.dispatch(step);
        return dispatch.result ?? {
            success: false,
            summary: dispatch.reason ?? "Actuation blocked.",
            completedAt: new Date().toISOString(),
            executionStatus: "blocked",
            executed: false,
            verified: false,
        };
    },
});

function makeWorkflow(id: string, step: WorkflowStep): Workflow {
    return {
        id,
        goal: "Production runtime acceptance attack",
        status: WorkflowStatus.READY,
        steps: [step],
        requiresFounderApproval: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { source: "v8-14-runtime-acceptance-attack" },
    };
}

async function main(): Promise<void> {
    const successfulStep: WorkflowStep = {
        id: "runtime-success-step",
        workflowId: "runtime-success-workflow",
        title: "Controlled email execution",
        description: "Safe acceptance-test actuator.",
        agentId: "sales",
        capability: "email.send",
        dependsOn: [],
        priority: Priority.MEDIUM,
        requiresApproval: false,
        status: "READY",
    };

    const successWorkflow = makeWorkflow(
        "runtime-success-workflow",
        successfulStep,
    );

    const first = await orchestrator.runReadySteps(successWorkflow);
    assert.deepEqual(first.executedStepIds, [successfulStep.id]);
    assert.equal(successWorkflow.steps[0].status, "COMPLETED");
    assert.equal(executed.length, 1);

    const replay = await orchestrator.runReadySteps(successWorkflow);
    assert.deepEqual(replay.executedStepIds, []);
    assert.equal(executed.length, 1);

    const approvalStep: WorkflowStep = {
        ...successfulStep,
        id: "runtime-approval-step",
        workflowId: "runtime-approval-workflow",
        requiresApproval: true,
        status: "READY",
    };

    const approvalWorkflow = makeWorkflow(
        "runtime-approval-workflow",
        approvalStep,
    );
    const approval = await orchestrator.runReadySteps(approvalWorkflow);
    assert.deepEqual(approval.executedStepIds, []);
    assert.equal(approval.results[approvalStep.id]?.executionStatus, "blocked");
    assert.equal(executed.length, 1);

    const missingCapabilityStep: WorkflowStep = {
        ...successfulStep,
        id: "runtime-missing-capability-step",
        workflowId: "runtime-missing-capability-workflow",
        capability: "calendar.schedule",
        status: "READY",
    };

    const missingCapabilityWorkflow = makeWorkflow(
        "runtime-missing-capability-workflow",
        missingCapabilityStep,
    );
    const missingCapability = await orchestrator.runReadySteps(
        missingCapabilityWorkflow,
    );
    assert.deepEqual(missingCapability.executedStepIds, []);
    assert.equal(
        missingCapability.results[missingCapabilityStep.id]?.executionStatus,
        "blocked",
    );
    assert.equal(executed.length, 1);

    const invalidStatusStep: WorkflowStep = {
        ...successfulStep,
        id: "runtime-invalid-status-step",
        workflowId: "runtime-invalid-status-workflow",
        status: "FAILED",
    };

    const invalidStatusDispatch = await composition.dispatch(invalidStatusStep);
    assert.equal(invalidStatusDispatch.allowed, false);
    assert.match(
        invalidStatusDispatch.reason ?? "",
        /READY or RUNNING/,
    );
    assert.equal(executed.length, 1);

    console.log("");
    console.log("V8.14 — PRODUCTION RUNTIME ACCEPTANCE ATTACK");
    console.log("Initial controlled V6 execution : PASS");
    console.log("Workflow replay / no duplicate  : PASS");
    console.log("Approval boundary               : PASS");
    console.log("Unavailable capability          : PASS");
    console.log("Invalid execution state         : PASS");
    console.log("Controlled actuator executions  :", executed.length);
    console.log("V6 runtime acceptance attack   : PASS");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
