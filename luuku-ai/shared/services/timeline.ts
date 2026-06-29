import crypto from "crypto";
import { TimelineEvent } from "../types/timeline";

export function addTimelineEvent(
    memory: any,
    agent: string,
    action: string,
    details?: string
) {

    if (!memory.timeline) {
        memory.timeline = [];
    }

    const event: TimelineEvent = {
        id: crypto.randomUUID(),
        agent,
        action,
        details,
        timestamp: new Date().toISOString()
    };

    memory.timeline.push(event);

    return memory;
}