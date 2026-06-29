import { TimelineEvent } from "./timeline";

export interface ProspectMemory {

    id: string;

    business: string;

    sector: string;

    region: string;

    fitScore: number;

    recommendedOffer: string;

    owner: string;

    status:
        | "researched"
        | "contacted"
        | "meeting-booked"
        | "proposal-sent"
        | "won"
        | "lost";

    archived: boolean;

    createdAt: string;

    updatedAt: string;

    timeline?: TimelineEvent[];

}