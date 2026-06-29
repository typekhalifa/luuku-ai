import { ProspectMemory } from "../types/memory";
import {
    loadProspectMemory,
    saveProspect
} from "./sales-memory";
import { addTimelineEvent } from "./timeline";

export function createProspect(
    prospect: ProspectMemory
): ProspectMemory {

    addTimelineEvent(
        prospect,
        "Research Agent",
        "Prospect researched",
        "Initial business research completed"
    );

    saveProspect(prospect);

    return prospect;

}

export function getProspect(
    business: string
): ProspectMemory | null {

    return loadProspectMemory(
        business
    );

}

export function updateProspect(

    business: string,

    updates: Partial<ProspectMemory>

): ProspectMemory | null {

    const prospect =
        loadProspectMemory(business);

    if (!prospect)
        return null;

    Object.assign(
        prospect,
        updates
    );

    prospect.updatedAt =
        new Date().toISOString();

    saveProspect(prospect);

    return prospect;

}

export function archiveProspect(
    business: string
): ProspectMemory | null {

    const prospect = getProspect(business);

    if (!prospect) {

        return null;

    }

    addTimelineEvent(

        prospect,

        "Executive AI",

        "Prospect archived",

        "Removed from active pipeline"

    );

    return updateProspect(

        business,

        {

            archived: true

        }

    );

}

export function restoreProspect(
    business: string
): ProspectMemory | null {

    const prospect = getProspect(business);

    if (!prospect) {

        return null;

    }

    addTimelineEvent(

        prospect,

        "Executive AI",

        "Prospect restored",

        "Returned to active pipeline"

    );

    return updateProspect(

        business,

        {

            archived: false

        }

    );

}