import assert from "node:assert/strict";

import { AgentResult } from "../../../shared/agents/interface";
import { registerAgent } from "../../../shared/agents/registry";
import { Priority } from "../../task/priority";
import { SharedAgentWorkflowExecutor } from "../shared-agent-workflow-executor";
import { Workflow } from "../workflow";
import { WorkflowOrchestrator } from "../workflow-orchestrator";
import { WorkflowStatus } from "../workflow-status";

const executed: string[] = [];

function registerControlledAgent(id: string, label: string): void {
    registerAgent({
        id,
        name: label,
        role: "controlled V6 integration test agent",
        async execute(task): Promise<AgentResult> {
            executed.push(task.id);
            return {
                success: true,
                summary: `${label} completed ${task.id}.`,
                completedAt: new Date().toISOString(),
                executionStatus: "completed",
                executed: true,
                verified: true,
                evidence: {
                    provider: "controlled-v6-agent",
                    externalId: task.id,
                    details: { networkRequestMade: false },
                },
            };
        },
    });
}

registerControlledAgent("v6-research-agent", "V6 Research Agent");
registerControlledAgent("v6-sales-agent", "V6 Sales Agent");

const now = new Date();

const workflow: Workflow = {
    id: "v6-multi-step-agent-chain-demo",
    goal: "Research Company X, then prepare its proposal.",
    status: WorkflowStatus.READY,
    steps: [
        {
            id: "research-company",
            title: "Research Company X",
            description: "Research the prospect.",
            agentId: "v6-research-agent",
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
            agentId: "v6-sales-agent",
            capability: "sales.proposal",
            dependsOn: ["research-company"],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "PENDING",
            input: { company: "Company X" },
        },
    ],
    requiresFounderApproval: false,
    metadata: { source: "v6-multi-step-agent-chain-demo" },
    createdAt: now,
    updatedAt: now,
};

async function main() {
    const orchestrator = new WorkflowOrchestrator(
        undefined,
        new SharedAgentWorkflowExecutor(),
    );

    console.log("");
    console.log("========================================");
    console.log("     V6 MULTI-STEP AGENT CHAIN DEMO");
    console.log("========================================");
    console.log("");

    const first = await orchestrator.runReadySteps(workflow);

    console.log("After first orchestration cycle:");
    console.log(`  Executed : ${first.executedStepIds.join(", ") || "none"}`);
    console.log(`  Runnable : ${first.runnableStepIds.join(", ") || "none"}`);

    assert.deepEqual(first.executedStepIds, ["research-company"]);
    assert.deepEqual(first.runnableStepIds, ["prepare-proposal"]);
    assert.equal(workflow.steps[0].status, "COMPLETED");
    assert.equal(workflow.steps[1].status, "PENDING");

    const second = await orchestrator.runReadySteps(workflow);

    console.log("");
    console.log("After second orchestration cycle:");
    console.log(`  Executed : ${second.executedStepIds.join(", ") || "none"}`);
    console.log(`  Runnable : ${second.runnableStepIds.join(", ") || "none"}`);

    assert.deepEqual(second.executedStepIds, ["prepare-proposal"]);
    assert.deepEqual(second.runnableStepIds, []);
    assert.equal(workflow.steps[1].status, "COMPLETED");
    assert.deepEqual(executed, ["research-company", "prepare-proposal"]);

    console.log("");
    console.log("✓ Research agent executed through the shared registry.");
    console.log("✓ Research completion made the sales step runnable.");
    console.log("✓ Sales agent executed through the same orchestration boundary.");
    console.log("✓ Multi-step dependency progression completed successfully.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
