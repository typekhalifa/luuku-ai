export interface EventContext {

    workflowId: string;

    agent: string;

    correlationId: string;

    causationId?: string;

}