import assert from "node:assert/strict";

import { AgentResult } from "../../../shared/agents/interface";
import { Priority } from "../../task/priority";
import { Workflow } from "../workflow";
import { WorkflowOrchestrator, WorkflowStepExecutor } from "../workflow-orchestrator";
import { WorkflowStatus } from "../workflow-status";
import { WorkflowStep } from "../workflow-step";

const now = new Date();

const workflow: Workflow = {
    id: "v6-orchestrator-demo",
    goal: "Prepare Company X for founder-approved onboarding.",
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
            status: "READY",
            input: { company: "Company X" },
        },
        {
            id: "prepare-proposal",
            title: "Prepare Proposal",
            description: "Prepare a proposal from the research.",
            agentId: "sales",
            capability: "sales.proposal",
            dependsOn: ["research-company"],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "PENDING",
        },
    ],
    requiresFounderApproval: false,
    metadata: {
        source: "v6-workflow-orchestrator-demo",
    },
    createdAt: now,
    updatedAt: now,
};

const executed: string[] = [];

const executor: WorkflowStepExecutor = {
    async execute(step: WorkflowStep): Promise<AgentResult> {
        executed.push(step.id);

        return {
            success: true,
            summary: `${step.id} executed by controlled test executor.`,
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
        };
    },
};

async function main() {
    const orchestrator = new WorkflowOrchestrator(undefined, executor);

    console.log("");
    console.log("========================================");
    console.log("      V6 WORKFLOW ORCHESTRATOR DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Workflow: ${workflow.id}`);

    const result = await orchestrator.runReadySteps(workflow);

    console.log("");
    console.log("Orchestration result:");
    console.log(`  Executed : ${result.executedStepIds.join(", ") || "none"}`);
    console.log(`  Runnable : ${result.runnableStepIds.join(", ") || "none"}`);
    console.log(`  Waiting  : ${result.waitingStepIds.join(", ") || "none"}`);
    console.log(`  Blocked  : ${result.blockedStepIds.join(", ") || "none"}`);

    assert.deepEqual(executed, ["research-company"]);
    assert.deepEqual(result.executedStepIds, ["research-company"]);
    assert.deepEqual(result.runnableStepIds, ["prepare-proposal"]);
    assert.deepEqual(result.waitingStepIds, []);
    assert.deepEqual(result.blockedStepIds, []);
    assert.equal(workflow.steps[0].status, "COMPLETED");
    assert.equal(workflow.steps[1].status, "PENDING");

    console.log("");
    console.log("✓ Orchestrator executed only the currently runnable step.");
    console.log("✓ Completed execution advanced the workflow dependency graph.");
    console.log("✓ Newly unblocked work became runnable.");
    console.log("✓ No external agent or provider was invoked.");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
