import { TimelineEvent } from "./timeline";

export interface ProspectMemory {

    id: string;

    business: string;

    sector: string;

    region: string;

    fitScore: number;

    recommendedOffer: string;

    status:
        | "researched"
        | "contacted"
        | "meeting-booked"
        | "proposal-sent"
        | "won"
        | "lost";

    createdAt: string;

    updatedAt: string;

    timeline?: TimelineEvent[];

}