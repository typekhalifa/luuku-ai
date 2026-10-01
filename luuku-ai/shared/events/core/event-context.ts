export interface EventContext {

    workflowId: string;

    agent: string;

    correlationId: string;

    causationId?: string;

    /**
     * Tenant identity for persisted/event-history consumers.
     * Events without a companyId are intentionally not exposed through
     * tenant-scoped API reads.
     */
    companyId?: string;

}