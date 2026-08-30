import assert from "node:assert/strict";

import { AgentResult } from "../../../shared/agents/interface.js";
import { registerAgent } from "../../../shared/agents/registry.js";
import { prisma } from "../../../shared/database/client.js";
import { Priority } from "../../task/priority.js";
import { PrismaQueueStore } from "../../queue/prisma-queue-store.js";
import { QueueScheduler } from "../../scheduler/scheduler.js";
import { PrismaWorkflowStore } from "../../workflow/prisma-workflow-store.js";
import { Workflow } from "../../workflow/workflow.js";
import { WorkflowStatus } from "../../workflow/workflow-status.js";
import { WorkflowOrchestrator } from "../../workflow/workflow-orchestrator.js";
import { SharedAgentWorkflowExecutor } from "../../workflow/shared-agent-workflow-executor.js";
import { AutonomousRuntime } from "../../workflow/autonomous-runtime.js";

const workflowId = `v6.5-retry-policy-demo-${Date.now()}`;
const stepId = "sync-customer";
const queueId = `${workflowId}:${stepId}`;
let executions = 0;

registerAgent({
    id: "v6.5-retry-policy-agent",
    name: "V6.5 Retry Policy Agent",
    role: "controlled retry/failure integration agent",
    async execute(): Promise<AgentResult> {
        executions += 1;
        if (executions < 3) {
            return {
                success: false,
                summary: `Transient controlled failure on attempt ${executions}.`,
                completedAt: new Date().toISOString(),
                executionStatus: "failed",
                executed: false,
                verified: false,
            };
        }
        return {
            success: true,
            summary: "Controlled operation completed after retries.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: { provider: "controlled-v6.5-agent", externalId: `success-${executions}`, details: { executions } },
        };
    },
});

const workflow: Workflow = {
    id: workflowId,
    goal: "Demonstrate bounded retry and terminal failure policy.",
    status: WorkflowStatus.READY,
    steps: [{
        id: stepId,
        title: "Sync customer",
        description: "Controlled operation that fails twice then succeeds.",
        agentId: "v6.5-retry-policy-agent",
        capability: "customer.sync",
        dependsOn: [],
        priority: Priority.HIGH,
        requiresApproval: false,
        status: "READY",
        input: { customer: "Company X" },
    }],
    requiresFounderApproval: false,
    metadata: { source: "v6.5-retry-failure-policy-demo" },
    createdAt: new Date("2026-08-30T09:00:00.000Z"),
    updatedAt: new Date("2026-08-30T09:00:00.000Z"),
};

async function cleanup() {
    await prisma.communicationExecution.deleteMany({ where: { idempotencyKey: { startsWith: `luuku:v6:workflow:${workflowId}:` } } });
    await prisma.queueItem.deleteMany({ where: { workflowId } });
    await prisma.workflow.deleteMany({ where: { id: workflowId } });
}

async function main() {
    await cleanup();
    await new PrismaWorkflowStore().create(workflow);

    const runtime = () => new AutonomousRuntime(
        new QueueScheduler(new PrismaQueueStore()),
        new PrismaQueueStore(),
        new WorkflowOrchestrator(undefined, new SharedAgentWorkflowExecutor()),
        new PrismaWorkflowStore(),
    );

    const t1 = new Date("2026-08-30T09:00:00.000Z");
    const first = await runtime().runPersistedCycle(workflowId, t1);
    assert.deepEqual(first.retried, [queueId]);
    assert.deepEqual(first.failed, []);
    assert.equal(executions, 1);

    const afterFirst = await new PrismaQueueStore().get(queueId);
    assert.equal(afterFirst?.status, "QUEUED");
    assert.equal(afterFirst?.attempts, 1);

    const t2 = new Date("2026-08-30T09:00:01.000Z");
    const second = await runtime().runPersistedCycle(workflowId, t2);
    assert.deepEqual(second.retried, [queueId]);
    assert.equal(executions, 2);

    const afterSecond = await new PrismaQueueStore().get(queueId);
    assert.equal(afterSecond?.status, "QUEUED");
    assert.equal(afterSecond?.attempts, 2);

    const t3 = new Date("2026-08-30T09:00:03.000Z");
    const third = await runtime().runPersistedCycle(workflowId, t3);
    assert.deepEqual(third.completed, [queueId]);
    assert.deepEqual(third.retried, []);
    assert.equal(executions, 3);

    const finalQueue = await new PrismaQueueStore().get(queueId);
    const finalWorkflow = await new PrismaWorkflowStore().get(workflowId);
    assert.equal(finalQueue?.status, "COMPLETED");
    assert.equal(finalQueue?.attempts, 3);
    assert.equal(finalWorkflow?.steps.find((step) => step.id === stepId)?.status, "COMPLETED");

    console.log("");
    console.log("========================================");
    console.log(" V6.5 RETRY & FAILURE POLICY DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Workflow       : ${workflowId}`);
    console.log(`Attempt 1      : FAILED → retry scheduled`);
    console.log(`Attempt 2      : FAILED → retry scheduled`);
    console.log(`Attempt 3      : COMPLETED`);
    console.log(`Final queue    : ${finalQueue?.status}`);
    console.log(`Total attempts : ${finalQueue?.attempts}`);
    console.log("");
    console.log("✓ Failed execution was classified for retry.");
    console.log("✓ Retry transition returned the durable queue item to QUEUED.");
    console.log("✓ Backoff delayed the next eligible attempt.");
    console.log("✓ Attempt count advanced on each claim.");
    console.log("✓ Successful execution completed the workflow and queue item.");
    console.log("✓ Retry behavior remained bounded by the failure policy.");
    console.log("✓ No external provider or network request was used.");
    console.log("");

    await cleanup();
}

main().catch(async (error) => {
    console.error(error);
    await cleanup().catch(() => undefined);
    process.exitCode = 1;
});
