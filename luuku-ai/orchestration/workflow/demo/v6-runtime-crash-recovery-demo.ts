import assert from "node:assert/strict";

import { AgentResult } from "../../../shared/agents/interface";
import { registerAgent } from "../../../shared/agents/registry";
import { Priority } from "../../task/priority";
import { PrismaQueueStore } from "../../queue/prisma-queue-store";
import { QueueItemStatus } from "../../queue/queue";
import { QueueScheduler } from "../../scheduler/scheduler";
import { PrismaWorkflowStore } from "../prisma-workflow-store";
import { Workflow } from "../workflow";
import { WorkflowStatus } from "../workflow-status";
import { WorkflowOrchestrator } from "../workflow-orchestrator";
import { SharedAgentWorkflowExecutor } from "../shared-agent-workflow-executor";
import { AutonomousRuntime } from "../autonomous-runtime";

const workflowId = "v6-runtime-crash-recovery-demo";
const stepId = "research-company";
const queueId = `${workflowId}:${stepId}`;
const executed: string[] = [];

registerAgent({
    id: "v6-crash-recovery-agent",
    name: "V6 Crash Recovery Agent",
    role: "controlled crash recovery integration agent",
    async execute(task): Promise<AgentResult> {
        executed.push(task.id);
        return {
            success: true,
            summary: `Controlled recovery agent completed ${task.id}.`,
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: {
                provider: "controlled-v6-crash-recovery-agent",
                externalId: task.id,
                details: { networkRequestMade: false },
            },
        };
    },
});

const startedAt = new Date("2026-08-29T09:00:00.000Z");
const restartedAt = new Date("2026-08-29T09:10:00.000Z");

const workflow: Workflow = {
    id: workflowId,
    goal: "Recover a claimed workflow step after a simulated runtime crash.",
    status: WorkflowStatus.READY,
    steps: [
        {
            id: stepId,
            title: "Research Company X",
            description: "Perform controlled research.",
            agentId: "v6-crash-recovery-agent",
            capability: "research.company",
            dependsOn: [],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "READY",
            input: { company: "Company X" },
        },
    ],
    requiresFounderApproval: false,
    metadata: { source: "v6-runtime-crash-recovery-demo" },
    createdAt: startedAt,
    updatedAt: startedAt,
};

function buildRuntime() {
    return new AutonomousRuntime(
        new QueueScheduler(new PrismaQueueStore()),
        new PrismaQueueStore(),
        new WorkflowOrchestrator(undefined, new SharedAgentWorkflowExecutor()),
        new PrismaWorkflowStore(),
        { queueClaimStaleAfterMs: 5 * 60 * 1000 },
    );
}

async function main() {
    const { prisma } = await import("../../../shared/database/client");

    await prisma.queueItem.deleteMany({ where: { workflowId } });
    await prisma.workflow.deleteMany({ where: { id: workflowId } });

    const workflowStore = new PrismaWorkflowStore();
    await workflowStore.create(workflow);

    // Runtime A schedules and claims the work, then the process disappears before execution.
    const runtimeA = buildRuntime();
    await runtimeA.scheduleRunnableSteps(workflow, startedAt);

    const queueBeforeCrash = new PrismaQueueStore();
    const claimed = await queueBeforeCrash.claimNext(startedAt);
    assert.equal(claimed?.id, queueId);
    assert.equal(claimed?.status, QueueItemStatus.CLAIMED);
    assert.equal(claimed?.attempts, 1);

    const persistedClaim = await new PrismaQueueStore().get(queueId);
    assert.equal(persistedClaim?.status, QueueItemStatus.CLAIMED);
    assert.equal(persistedClaim?.attempts, 1);

    // Runtime B is a fresh instance. It must recover the stale claim before claiming new work.
    const runtimeB = buildRuntime();
    const result = await runtimeB.runPersistedCycle(workflowId, restartedAt);

    const recoveredQueue = await new PrismaQueueStore().get(queueId);
    const recoveredWorkflow = await new PrismaWorkflowStore().get(workflowId);

    assert.deepEqual(result.recovered, [queueId]);
    assert.deepEqual(result.claimed, [queueId]);
    assert.deepEqual(result.executed, [stepId]);
    assert.deepEqual(result.completed, [queueId]);
    assert.equal(recoveredQueue?.status, QueueItemStatus.COMPLETED);
    assert.equal(recoveredQueue?.attempts, 2);
    assert.equal(recoveredWorkflow?.steps.find((step) => step.id === stepId)?.status, "COMPLETED");
    assert.deepEqual(executed, [stepId]);

    console.log("");
    console.log("========================================");
    console.log(" V6 RUNTIME CRASH RECOVERY DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Workflow       : ${workflowId}`);
    console.log(`Before crash   : CLAIMED (attempt 1)`);
    console.log(`Fresh runtime  : recovered stale claim`);
    console.log(`After recovery : ${recoveredQueue?.status} (attempt ${recoveredQueue?.attempts})`);
    console.log(`Workflow step  : ${recoveredWorkflow?.steps.find((step) => step.id === stepId)?.status}`);
    console.log("");
    console.log("✓ Queue claim survived the simulated process crash.");
    console.log("✓ Fresh runtime detected the stale CLAIMED item.");
    console.log("✓ The stale claim was safely re-queued and claimed again.");
    console.log("✓ The workflow step executed and persisted as COMPLETED.");
    console.log("✓ Attempt count advanced from 1 to 2.");
    console.log("✓ No external provider or network request was used.");
    console.log("");

    await prisma.queueItem.deleteMany({ where: { workflowId } });
    await prisma.workflow.delete({ where: { id: workflowId } });
}

main().catch(async (error) => {
    console.error(error);
    const { prisma } = await import("../../../shared/database/client");
    await prisma.queueItem.deleteMany({ where: { workflowId } }).catch(() => undefined);
    await prisma.workflow.deleteMany({ where: { id: workflowId } }).catch(() => undefined);
    process.exitCode = 1;
});
