import assert from "node:assert/strict";

import type { AgentResult } from "../../../shared/agents/interface.js";
import { Priority } from "../../task/priority.js";
import { InMemoryQueueStore, QueueItemStatus } from "../../queue/queue.js";
import { QueueScheduler } from "../../scheduler/scheduler.js";
import { InMemoryWorkflowStore } from "../../workflow/workflow-store.js";
import { WorkflowOrchestrator, type WorkflowStepExecutor } from "../../workflow/workflow-orchestrator.js";
import { AutonomousRuntime } from "../../workflow/autonomous-runtime.js";
import type { Workflow } from "../../workflow/workflow.js";
import { WorkflowStatus } from "../../workflow/workflow-status.js";

const companyA = { scope: "COMPANY" as const, companyId: "resilience-tenant-a" };
const companyB = { scope: "COMPANY" as const, companyId: "resilience-tenant-b" };

function makeWorkflow(
    id: string,
    companyId: string,
    stepId: string,
    capability: string,
): Workflow {
    const ownership = { scope: "COMPANY" as const, companyId };

    return {
        id,
        ownership,
        goal: "Phase 4 production runtime resilience attack",
        status: WorkflowStatus.READY,
        steps: [{
            id: stepId,
            title: "Execute controlled resilience work",
            description: "Deterministic in-memory runtime acceptance work.",
            agentId: "resilience-agent",
            capability,
            dependsOn: [],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "READY",
        }],
        requiresFounderApproval: false,
        metadata: { source: "v8-15-production-runtime-resilience-attack" },
        createdAt: new Date("2026-10-04T08:00:00.000Z"),
        updatedAt: new Date("2026-10-04T08:00:00.000Z"),
    };
}

class ControlledResilienceExecutor implements WorkflowStepExecutor {
    readonly executed: string[] = [];
    private readonly failures = new Set<string>();

    failFirst(stepId: string): void {
        this.failures.add(stepId);
    }

    async execute(step: Workflow["steps"][number]): Promise<AgentResult> {
        if (this.failures.delete(step.id)) {
            return {
                success: false,
                summary: "Controlled transient failure; retry is expected.",
                completedAt: new Date().toISOString(),
                executionStatus: "failed",
                executed: false,
                verified: false,
                evidence: { provider: "v8-15-controlled-resilience" },
            };
        }

        this.executed.push(step.id);
        return {
            success: true,
            summary: "Controlled resilience execution completed.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: {
                provider: "v8-15-controlled-resilience",
                externalId: step.id,
            },
        };
    }
}

function buildRuntime(
    workflowStore: InMemoryWorkflowStore,
    queue: InMemoryQueueStore,
    executor: WorkflowStepExecutor,
): AutonomousRuntime {
    return new AutonomousRuntime(
        new QueueScheduler(queue),
        queue,
        new WorkflowOrchestrator(undefined, executor),
        workflowStore,
        {
            queueClaimStaleAfterMs: 5 * 60 * 1000,
            failurePolicy: {
                maxAttempts: 3,
                baseBackoffMs: 0,
                maxBackoffMs: 0,
            },
        },
    );
}

async function main(): Promise<void> {
    const workflowStoreA = new InMemoryWorkflowStore(companyA);
    const workflowStoreB = new InMemoryWorkflowStore(companyB);
    const queueA = new InMemoryQueueStore(companyA);
    const queueB = new InMemoryQueueStore(companyB);
    const executor = new ControlledResilienceExecutor();

    const crashWorkflow = makeWorkflow(
        "v8-15-crash-recovery-workflow",
        companyA.companyId,
        "crash-recovery-step",
        "runtime.resilience",
    );
    await workflowStoreA.create(crashWorkflow);

    const startedAt = new Date("2026-10-04T08:00:00.000Z");
    const restartedAt = new Date("2026-10-04T08:10:00.000Z");

    // Runtime A disappears after claiming work. Runtime B is a fresh instance
    // over the same durable stores and must recover the stale claim.
    const runtimeA = buildRuntime(workflowStoreA, queueA, executor);
    await runtimeA.scheduleRunnableSteps(crashWorkflow, startedAt);

    const claimedBeforeCrash = await queueA.claimNext(startedAt);
    assert.equal(claimedBeforeCrash?.status, QueueItemStatus.CLAIMED);
    assert.equal(claimedBeforeCrash?.attempts, 1);

    const runtimeB = buildRuntime(workflowStoreA, queueA, executor);
    const recovered = await runtimeB.runPersistedCycle(
        crashWorkflow.id,
        restartedAt,
    );

    assert.deepEqual(recovered.recovered, [
        `${crashWorkflow.id}:${crashWorkflow.steps[0].id}`,
    ]);
    assert.deepEqual(recovered.claimed, [
        `${crashWorkflow.id}:${crashWorkflow.steps[0].id}`,
    ]);
    assert.deepEqual(recovered.executed, [crashWorkflow.steps[0].id]);
    assert.deepEqual(recovered.completed, [
        `${crashWorkflow.id}:${crashWorkflow.steps[0].id}`,
    ]);

    const afterRecovery = await queueA.get(
        `${crashWorkflow.id}:${crashWorkflow.steps[0].id}`,
    );
    assert.equal(afterRecovery?.status, QueueItemStatus.COMPLETED);
    assert.equal(afterRecovery?.attempts, 2);

    // A fresh runtime after successful completion must not dispatch the same
    // durable workflow step again.
    const replay = await buildRuntime(workflowStoreA, queueA, executor)
        .runPersistedCycle(
            crashWorkflow.id,
            new Date("2026-10-04T08:11:00.000Z"),
        );
    assert.deepEqual(replay.executed, []);
    assert.deepEqual(executor.executed, [crashWorkflow.steps[0].id]);

    // Tenant B must not see, claim, or inject Tenant A's durable work.
    assert.equal(await workflowStoreB.get(crashWorkflow.id), null);
    assert.equal(await queueB.get(
        `${crashWorkflow.id}:${crashWorkflow.steps[0].id}`,
    ), null);
    assert.equal(await queueB.claimNext(restartedAt), null);

    await assert.rejects(
        () => queueB.enqueue(claimedBeforeCrash!),
        /QUEUE_OWNERSHIP_MISMATCH/,
    );

    // A transient failure may retry through a fresh runtime, while retaining
    // one durable queue identity and a bounded attempt count.
    const retryWorkflow = makeWorkflow(
        "v8-15-retry-workflow",
        companyA.companyId,
        "retry-step",
        "runtime.retry",
    );
    await workflowStoreA.create(retryWorkflow);
    executor.failFirst(retryWorkflow.steps[0].id);

    const firstFailure = await buildRuntime(workflowStoreA, queueA, executor)
        .runPersistedCycle(
            retryWorkflow.id,
            new Date("2026-10-04T08:12:00.000Z"),
        );

    const retryQueueId = `${retryWorkflow.id}:${retryWorkflow.steps[0].id}`;
    assert.deepEqual(firstFailure.retried, [retryQueueId]);

    const afterFailure = await queueA.get(retryQueueId);
    assert.equal(afterFailure?.status, QueueItemStatus.QUEUED);
    assert.equal(afterFailure?.attempts, 1);

    const secondRun = await buildRuntime(workflowStoreA, queueA, executor)
        .runPersistedCycle(
            retryWorkflow.id,
            new Date("2026-10-04T08:13:00.000Z"),
        );

    assert.deepEqual(secondRun.executed, [retryWorkflow.steps[0].id]);
    assert.deepEqual(secondRun.completed, [retryQueueId]);

    const afterRetry = await queueA.get(retryQueueId);
    assert.equal(afterRetry?.status, QueueItemStatus.COMPLETED);
    assert.equal(afterRetry?.attempts, 2);
    assert.deepEqual(executor.executed, [
        crashWorkflow.steps[0].id,
        retryWorkflow.steps[0].id,
    ]);

    console.log("");
    console.log("V8.15 — PRODUCTION RUNTIME RESILIENCE ATTACK");
    console.log("Stale claim recovery after restart : PASS");
    console.log("Completed-work replay protection    : PASS");
    console.log("Cross-tenant workflow isolation    : PASS");
    console.log("Cross-tenant queue isolation       : PASS");
    console.log("Transient failure retry             : PASS");
    console.log("Bounded retry attempt identity      : PASS");
    console.log("Controlled executions               :", executor.executed.length);
    console.log("Production runtime resilience       : PASS");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
