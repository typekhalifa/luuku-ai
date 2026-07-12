export type DealStage =
    | "lead"
    | "qualified"
    | "discovery"
    | "proposal"
    | "negotiation"
    | "won"
    | "lost";

export interface Deal {

    id: string;

    companyId: string;

    title: string;

    value: number;

    currency: string;

    stage: DealStage;

    probability: number;

    ownerAgentId: string;

    nextAction: string;

    dueDate?: string;

    expectedCloseDate?: string;

    lastActivityAt?: string;

    createdAt: string;

    updatedAt: string;

}