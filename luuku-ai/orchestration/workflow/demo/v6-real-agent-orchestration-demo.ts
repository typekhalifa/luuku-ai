import assert from "node:assert/strict";

import { AgentResult } from "../../../shared/agents/interface";
import { registerAgent } from "../../../shared/agents/registry";
import { Workflow } from "../workflow";
import { WorkflowStatus } from "../workflow-status";
import { WorkflowOrchestrator } from "../workflow-orchestrator";
import { SharedAgentWorkflowExecutor } from "../shared-agent-workflow-executor";
import { WorkflowStep } from "../workflow-step";
import { Priority } from "../../task/priority";

const executed: string[] = [];

registerAgent({
    id: "v6-real-agent-test",
    name: "V6 Controlled Agent",
    role: "controlled V6 integration test agent",
    async execute(task): Promise<AgentResult> {
        executed.push(task.id);

        return {
            success: true,
            summary: `Controlled agent completed ${task.id}.`,
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: {
                provider: "controlled-v6-agent",
                externalId: task.id,
                details: {
                    networkRequestMade: false,
                },
            },
        };
    },
});

const now = new Date();

const workflow: Workflow = {
    id: "v6-real-agent-orchestration-demo",
    goal: "Execute a controlled research step through the real agent boundary.",
    status: WorkflowStatus.READY,
    steps: [
        {
            id: "research-company",
            title: "Research Company X",
            description: "Execute controlled research through the registered agent.",
            agentId: "v6-real-agent-test",
            capability: "research.company",
            dependsOn: [],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "READY",
            input: { company: "Company X" },
        },
    ],
    requiresFounderApproval: false,
    metadata: {
        source: "v6-real-agent-orchestration-demo",
    },
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
    console.log("     V6 REAL AGENT ORCHESTRATION DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Agent    : v6-real-agent-test`);
    console.log(`Step     : research-company`);

    const result = await orchestrator.runReadySteps(workflow);
    const agentResult = result.results["research-company"];

    console.log("");
    console.log("Execution result:");
    console.log(`  Executed : ${result.executedStepIds.join(", ") || "none"}`);
    console.log(`  Success  : ${agentResult?.success}`);
    console.log(`  Verified : ${agentResult?.verified}`);
    console.log(`  Workflow : ${workflow.steps[0].status}`);

    assert.deepEqual(executed, ["research-company"]);
    assert.deepEqual(result.executedStepIds, ["research-company"]);
    assert.equal(agentResult?.success, true);
    assert.equal(agentResult?.executed, true);
    assert.equal(agentResult?.verified, true);
    assert.equal(workflow.steps[0].status, "COMPLETED");
    assert.deepEqual(result.runnableStepIds, []);
    assert.deepEqual(result.waitingStepIds, []);
    assert.deepEqual(result.blockedStepIds, []);

    console.log("");
    console.log("✓ V6 orchestrator dispatched through the shared agent executor.");
    console.log("✓ Agent resolved through the existing shared registry.");
    console.log("✓ AgentResult returned through the V6 orchestration boundary.");
    console.log("✓ Workflow step advanced to COMPLETED.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
