export type ProspectPipelineStatus =
    | "researched"
    | "contacted"
    | "meeting-booked"
    | "proposal-sent"
    | "won"
    | "lost";

export interface ResearchedProspect {
    id: string;
    tenantCompanyId: string;
    researchTaskId: string;
    workflowId?: string;
    business: string;
    industry: string;
    website?: string;
    country: string;
    city?: string;
    size?: string;
    fitScore: number;
    recommendedOffer: string;
    owner: string;
    status: ProspectPipelineStatus;
    archived: boolean;
    researchEvidence: unknown;
    qualification: unknown;
    createdAt: string;
    updatedAt: string;
}
