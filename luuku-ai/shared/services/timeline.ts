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

export function getLatestEvents(
    memory: any,
    limit = 10
) {

    if (!memory.timeline) {

        return [];

    }

    return [...memory.timeline]

        .sort(

            (a, b) =>

                new Date(b.timestamp).getTime()

                -

                new Date(a.timestamp).getTime()

        )

        .slice(0, limit);

}

export function getEventsByAgent(

    memory: any,

    agent: string

) {

    if (!memory.timeline)

        return [];

    return memory.timeline.filter(

        (event: any) =>

            event.agent === agent

    );

}

export function getEventsByBusiness(
    memory: any
) {

    return memory.timeline ?? [];

}