import assert from "node:assert/strict";

import type { AgentResult } from "../../../shared/agents/interface.js";
import { Priority } from "../../task/priority.js";
import { InMemoryQueueStore } from "../../queue/queue.js";
import { QueueScheduler } from "../../scheduler/scheduler.js";
import { InMemoryWorkflowStore } from "../../workflow/workflow-store.js";
import { WorkflowOrchestrator, type WorkflowStepExecutor } from "../../workflow/workflow-orchestrator.js";
import { AutonomousRuntime } from "../../workflow/autonomous-runtime.js";
import { WorkflowStatus } from "../../workflow/workflow-status.js";
import type { Workflow } from "../../workflow/workflow.js";

const companyA = { scope: "COMPANY" as const, companyId: "tenant-a" };
const companyB = { scope: "COMPANY" as const, companyId: "tenant-b" };

const workflowId = "workflow-tenant-isolation-demo";
const stepId = "tenant-a-step";
const queueId = `${workflowId}:${stepId}`;

const workflowA: Workflow = {
    id: workflowId,
    ownership: companyA,
    goal: "Prove Workflow -> Queue -> Runtime -> V6 ownership continuity.",
    status: WorkflowStatus.READY,
    steps: [{
        id: stepId,
        title: "Execute controlled tenant-scoped work",
        description: "A deterministic in-memory V6-bound execution.",
        agentId: "tenant-isolation-agent",
        capability: "tenant.isolation.demo",
        dependsOn: [],
        priority: Priority.HIGH,
        requiresApproval: false,
        status: "READY",
    }],
    requiresFounderApproval: false,
    metadata: { source: "workflow-queue-runtime-isolation-demo" },
    createdAt: new Date(),
    updatedAt: new Date(),
};

class OwnershipAwareExecutor implements WorkflowStepExecutor {
    public observedCompanyId: string | undefined;

    async execute(step: Workflow["steps"][number]): Promise<AgentResult> {
        const ownership = step.ownership;
        assert.equal(ownership?.scope, "COMPANY");
        assert.equal(ownership.companyId, companyA.companyId);
        this.observedCompanyId = ownership.companyId;

        return {
            success: true,
            summary: "Controlled tenant-scoped execution completed.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: {
                provider: "in-memory-v6-boundary",
            },
        };
    }
}

async function main() {
    const workflowStoreA = new InMemoryWorkflowStore(companyA);
    const workflowStoreB = new InMemoryWorkflowStore(companyB);
    const queueA = new InMemoryQueueStore(companyA);
    const queueB = new InMemoryQueueStore(companyB);

    await workflowStoreA.create(workflowA);

    assert.equal(await workflowStoreB.get(workflowId), null);
    assert.equal((await workflowStoreB.list()).length, 0);

    await assert.rejects(
        () => workflowStoreB.save(workflowA),
        /WORKFLOW_OWNERSHIP_MISMATCH/,
    );

    const schedulerA = new QueueScheduler(queueA);
    const queueItem = await schedulerA.schedule({
        id: queueId,
        ownership: companyA,
        workflowId,
        stepId,
        agentId: "tenant-isolation-agent",
        availableAt: new Date(),
        priority: Priority.HIGH,
        metadata: { source: "tenant-isolation-demo" },
    });

    assert.equal(await queueB.get(queueId), null);
    assert.equal(await queueB.claimNext(), null);
    await assert.rejects(
        () => queueB.enqueue(queueItem),
        /QUEUE_OWNERSHIP_MISMATCH/,
    );

    const executor = new OwnershipAwareExecutor();
    const runtime = new AutonomousRuntime(
        new QueueScheduler(queueA),
        queueA,
        new WorkflowOrchestrator(undefined, executor),
        workflowStoreA,
    );

    const result = await runtime.runPersistedCycle(workflowId, new Date());
    assert.deepEqual(result.claimed, [queueId]);
    assert.deepEqual(result.executed, [stepId]);
    assert.deepEqual(result.completed, [queueId]);
    assert.equal(executor.observedCompanyId, companyA.companyId);

    assert.equal((await queueB.list()).length, 0);
    assert.equal((await workflowStoreB.list()).length, 0);

    console.log("");
    console.log("==============================================");
    console.log(" WORKFLOW -> QUEUE -> RUNTIME -> V6 ISOLATION");
    console.log("==============================================");
    console.log("");
    console.log("Company A workflow read : ALLOWED");
    console.log("Company B workflow read : BLOCKED");
    console.log("Company B workflow save : BLOCKED");
    console.log("Company A queue claim   : ALLOWED");
    console.log("Company B queue claim   : BLOCKED");
    console.log("V6 execution ownership : tenant-a");
    console.log("Runtime completion     : COMPLETED");
    console.log("");
    console.log("✓ Workflow persistence is ownership-bound.");
    console.log("✓ Queue persistence is ownership-bound.");
    console.log("✓ Runtime preserves workflow ownership into queued work.");
    console.log("✓ V6 orchestration receives the explicit workflow ownership.");
    console.log("✓ Cross-tenant workflow and queue access is denied.");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
