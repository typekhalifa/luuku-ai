import type { QueueItem, QueueStore } from "../../orchestration/queue/queue.js";
import { QueueItemStatus } from "../../orchestration/queue/queue.js";
import type { Workflow } from "../../orchestration/workflow/workflow.js";
import { WorkflowStatus } from "../../orchestration/workflow/workflow-status.js";
import type { WorkflowStore } from "../../orchestration/workflow/workflow-store.js";
import type { ExecutiveState } from "../executive/executive-state.js";

/**
 * Reads the current executive view directly from V6 durable orchestration truth.
 * No cached executive snapshot is treated as authoritative.
 */
export class DurableExecutiveStateSource {
    constructor(
        private readonly workflows: WorkflowStore,
        private readonly queue: QueueStore,
    ) {}

    async snapshot(): Promise<ExecutiveState> {
        const [workflowRecords, queueRecords] = await Promise.all([
            this.workflows.list(),
            this.queue.list(),
        ]);

        return project(workflowRecords, queueRecords);
    }
}

function project(workflows: readonly Workflow[], queue: readonly QueueItem[]): ExecutiveState {
    const attention: string[] = [];
    const failedWorkIds = workflows
        .filter((workflow) => workflow.status === WorkflowStatus.FAILED)
        .map((workflow) => workflow.id);

    for (const workflow of workflows) {
        if (workflow.status === WorkflowStatus.AWAITING_APPROVAL) {
            attention.push(`Approval required: ${workflow.goal} (${workflow.id})`);
        }
    }

    const failedQueueItems = queue.filter((item) => item.status === QueueItemStatus.FAILED);
    if (failedQueueItems.length > 0) {
        attention.push(`${failedQueueItems.length} queued execution item(s) failed.`);
    }

    return {
        generatedAt: new Date(),
        active: workflows.filter((workflow) =>
            workflow.status === WorkflowStatus.READY || workflow.status === WorkflowStatus.RUNNING,
        ).length,
        waitingApproval: workflows.filter((workflow) => workflow.status === WorkflowStatus.AWAITING_APPROVAL).length,
        failed: failedWorkIds.length,
        completed: workflows.filter((workflow) => workflow.status === WorkflowStatus.COMPLETED).length,
        attention,
        failedWorkIds,
    };
}
