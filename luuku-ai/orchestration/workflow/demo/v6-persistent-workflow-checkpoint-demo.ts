import assert from "node:assert/strict";

import { Workflow } from "../workflow";
import { WorkflowStatus } from "../workflow-status";
import { WorkflowStep } from "../workflow-step";
import { Priority } from "../../task/priority";

interface WorkflowCheckpoint {
    workflowId: string;
    status: WorkflowStatus;
    stepStates: Record<string, WorkflowStep["status"]>;
    updatedAt: string;
}

function createCheckpoint(workflow: Workflow): WorkflowCheckpoint {
    return {
        workflowId: workflow.id,
        status: workflow.status,
        stepStates: Object.fromEntries(
            workflow.steps.map((step) => [step.id, step.status]),
        ),
        updatedAt: workflow.updatedAt.toISOString(),
    };
}

function restoreCheckpoint(workflow: Workflow, checkpoint: WorkflowCheckpoint): void {
    assert.equal(workflow.id, checkpoint.workflowId);
    workflow.status = checkpoint.status;
    for (const step of workflow.steps) {
        const status = checkpoint.stepStates[step.id];
        if (status) step.status = status;
    }
    workflow.updatedAt = new Date(checkpoint.updatedAt);
}

const now = new Date();
const workflow: Workflow = {
    id: "v6-persistent-checkpoint-demo",
    goal: "Resume Company X onboarding after a process restart.",
    status: WorkflowStatus.READY,
    steps: [
        {
            id: "research-company",
            title: "Research Company X",
            description: "Research the prospect.",
            agentId: "research",
            capability: "research.company",
            dependsOn: [],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "COMPLETED",
        },
        {
            id: "prepare-proposal",
            title: "Prepare Proposal",
            description: "Prepare a proposal from research.",
            agentId: "sales",
            capability: "sales.proposal",
            dependsOn: ["research-company"],
            priority: Priority.HIGH,
            requiresApproval: true,
            status: "PENDING",
        },
    ],
    requiresFounderApproval: true,
    metadata: { source: "v6-persistent-workflow-checkpoint-demo" },
    createdAt: now,
    updatedAt: now,
};

async function main() {
    console.log("");
    console.log("========================================");
    console.log("   V6 WORKFLOW CHECKPOINT DEMO");
    console.log("========================================");
    console.log("");

    const checkpoint = createCheckpoint(workflow);

    console.log(`Checkpoint : ${checkpoint.workflowId}`);
    console.log(`Research   : ${checkpoint.stepStates["research-company"]}`);
    console.log(`Proposal   : ${checkpoint.stepStates["prepare-proposal"]}`);

    // Simulate a fresh process with a newly constructed workflow object.
    const restartedWorkflow: Workflow = {
        ...workflow,
        status: WorkflowStatus.READY,
        steps: workflow.steps.map((step) => ({ ...step, status: "PENDING" })),
        updatedAt: new Date(0),
    };

    restoreCheckpoint(restartedWorkflow, checkpoint);

    assert.equal(restartedWorkflow.id, workflow.id);
    assert.equal(restartedWorkflow.steps[0].status, "COMPLETED");
    assert.equal(restartedWorkflow.steps[1].status, "PENDING");
    assert.equal(restartedWorkflow.requiresFounderApproval, true);
    assert.equal(restartedWorkflow.updatedAt.toISOString(), checkpoint.updatedAt);

    console.log("");
    console.log("After process restart:");
    console.log(`  Research   : ${restartedWorkflow.steps[0].status}`);
    console.log(`  Proposal   : ${restartedWorkflow.steps[1].status}`);
    console.log(`  Approval   : ${restartedWorkflow.requiresFounderApproval}`);

    console.log("");
    console.log("✓ Workflow state was checkpointed without external services.");
    console.log("✓ Completed work survived a simulated process restart.");
    console.log("✓ Pending work remained pending instead of being re-executed.");
    console.log("✓ Founder approval metadata survived restoration.");
    console.log("✓ V6 can now define persistence as a separate infrastructure boundary.");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
