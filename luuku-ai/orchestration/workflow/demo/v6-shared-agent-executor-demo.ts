import assert from "node:assert/strict";

import { Agent, AgentResult } from "../../../shared/agents/interface";
import { registerAgent, getAgent } from "../../../shared/agents/registry";
import { SharedAgentWorkflowExecutor } from "../shared-agent-workflow-executor";
import { Priority } from "../../task/priority";
import { WorkflowStep } from "../workflow-step";

const TEST_AGENT_ID = "v6-controlled-test-agent";

const controlledAgent: Agent = {
    id: TEST_AGENT_ID,
    name: "V6 Controlled Test Agent",
    role: "controlled orchestration test executor",
    async execute(task): Promise<AgentResult> {
        return {
            success: true,
            summary: `Controlled agent executed ${task.id}.`,
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: {
                provider: "controlled-v6-agent",
                externalId: task.id,
                details: {
                    networkRequestMade: false,
                    taskId: task.id,
                },
            },
        };
    },
};

const step: WorkflowStep = {
    id: "research-company",
    title: "Research Company X",
    description: "Run controlled research execution.",
    agentId: TEST_AGENT_ID,
    capability: "research.company",
    dependsOn: [],
    priority: Priority.HIGH,
    requiresApproval: false,
    status: "READY",
    input: { company: "Company X" },
};

async function main() {
    registerAgent(controlledAgent);

    assert.ok(getAgent(TEST_AGENT_ID));

    const executor = new SharedAgentWorkflowExecutor();
    const result = await executor.execute(step);

    console.log("");
    console.log("========================================");
    console.log("   V6 SHARED AGENT EXECUTOR DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Agent    : ${TEST_AGENT_ID}`);
    console.log(`Step     : ${step.id}`);
    console.log(`Success  : ${result.success}`);
    console.log(`Executed : ${result.executed}`);
    console.log(`Verified : ${result.verified}`);
    console.log(`Evidence : ${result.evidence?.provider ?? "none"}`);

    assert.equal(result.success, true);
    assert.equal(result.executed, true);
    assert.equal(result.verified, true);
    assert.equal(result.evidence?.provider, "controlled-v6-agent");
    assert.equal(result.evidence?.details?.networkRequestMade, false);

    console.log("");
    console.log("✓ V6 workflow step resolved through the shared agent registry.");
    console.log("✓ Shared agent runner executed the registered controlled agent.");
    console.log("✓ AgentResult returned through the V6 execution boundary.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
