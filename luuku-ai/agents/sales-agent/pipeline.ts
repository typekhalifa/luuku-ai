import { addTimelineEvent } from "../../shared/services/timeline";
import { createFollowUpTask } from "../../shared/scheduler/followups";
import { saveTask } from "../../shared/scheduler/tasks";
import { updateProspect } from "../../shared/services/prospect";
import { loadProspectMemory } from "../../shared/services/sales-memory";

type ProspectStatus =
    | "researched"
    | "contacted"
    | "meeting-booked"
    | "proposal-sent"
    | "won"
    | "lost";

export function updateProspectStatus(
    business: string,
    status: ProspectStatus
) {
    const memory = loadProspectMemory(business);

    if (!memory) {
        throw new Error("Prospect not found.");
    }

    // A repeated request for the current state is a no-op.
    // This also prevents duplicate timeline entries on sequential retries.
    if (memory.status === status) {
        return memory;
    }

    if (status === "contacted") {
        // Use the pre-transition version as the idempotency key.
        // If task creation succeeds but the prospect write fails,
        // a retry sees the same updatedAt and reuses the same task ID.
        const transitionKey = memory.updatedAt || memory.createdAt;

        const task = createFollowUpTask(
            memory.business,
            3,
            memory.id,
            transitionKey
        );

        saveTask(task);
    }

    addTimelineEvent(
        memory,
        "Sales Agent",
        `Status updated to ${status}`,
        `Pipeline moved to ${status}`
    );

    // Persist the exact object whose timeline was just updated.
    const updated = updateProspect(
        business,
        {
            status,
            timeline: memory.timeline
        }
    );

    if (!updated) {
        throw new Error("Prospect update failed.");
    }

    return updated;
}
