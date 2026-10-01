import assert from "node:assert/strict";

import { AgentResult } from "../../../shared/agents/interface.js";
import { registerAgent } from "../../../shared/agents/registry.js";
import { Priority } from "../../task/priority.js";
import { PrismaWorkflowStore } from "../../workflow/prisma-workflow-store.js";
import { SharedAgentWorkflowExecutor } from "../../workflow/shared-agent-workflow-executor.js";
import { WorkflowStep } from "../../workflow/workflow-step.js";
import { prisma } from "../../../shared/database/client.js";
import { workflowStepIdempotencyKey } from "../execution-ledger.js";

const workflowId = `v6.4-idempotency-demo-${Date.now()}`;
const stepId = "send-proposal";
const idempotencyKey = workflowStepIdempotencyKey(workflowId, stepId);
let executions = 0;

registerAgent({
    id: "v6.4-idempotency-agent",
    name: "V6.4 Idempotency Agent",
    role: "controlled idempotency integration agent",
    async execute(): Promise<AgentResult> {
        executions += 1;
        return {
            success: true,
            summary: "Controlled side effect completed.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: {
                provider: "controlled-v6.4-agent",
                externalId: `effect-${executions}`,
                details: { sideEffectCount: executions },
            },
        };
    },
});

const step: WorkflowStep = {
    id: stepId,
    workflowId,
    title: "Send proposal",
    description: "Controlled side-effect boundary.",
    agentId: "v6.4-idempotency-agent",
    capability: "sales.proposal.send",
    dependsOn: [],
    priority: Priority.HIGH,
    requiresApproval: false,
    status: "READY",
};

async function cleanup() {
    await prisma.communicationExecution.deleteMany({ where: { idempotencyKey } });
}

async function main() {
    await cleanup();

    const executor = new SharedAgentWorkflowExecutor();

    // First dispatch creates the durable execution record and performs the side effect.
    const first = await executor.execute(step);
    assert.equal(first.success, true);
    assert.equal(executions, 1);

    // Replay after completion must return the durable result without a second side effect.
    const replay = await executor.execute(step);
    assert.equal(replay.success, true);
    assert.equal(executions, 1);

    await cleanup();

    // Simulate the dangerous crash window: execution was recorded as executing,
    // but the process died before completion was persisted.
    await prisma.communicationExecution.create({
        data: {
            taskId: stepId,
            idempotencyKey,
            capability: "workflow.step",
            channel: "internal",
            policyDecision: "allowed",
            policyReason: "V6.4 crash-window simulation",
            status: "executing",
            recipient: { workflowId, stepId },
        },
    });

    executions = 0;
    const uncertain = await executor.execute(step);
    assert.equal(uncertain.success, false);
    assert.equal(uncertain.executionStatus, "blocked");
    assert.equal(uncertain.executed, false);
    assert.equal(executions, 0);

    console.log("");
    console.log("========================================");
    console.log(" V6.4 IDEMPOTENT EXECUTION DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Workflow        : ${workflowId}`);
    console.log(`Idempotency key : ${idempotencyKey}`);
    console.log(`Initial execute : side effects = 1`);
    console.log(`Replay          : side effects = ${1}`);
    console.log(`Crash window    : unresolved execution detected`);
    console.log(`Recovery action : execution BLOCKED pending reconciliation`);
    console.log("");
    console.log("✓ Completed execution replay did not dispatch a second side effect.");
    console.log("✓ Idempotency identity survives process boundaries through PostgreSQL.");
    console.log("✓ An uncertain post-side-effect crash is NOT blindly retried.");
    console.log("✓ Provider reconciliation is required before an uncertain execution resumes.");
    console.log("✓ No external provider or network request was used.");
    console.log("");

    await cleanup();
}

main().catch(async (error) => {
    console.error(error);
    await cleanup().catch(() => undefined);
    process.exitCode = 1;
});
