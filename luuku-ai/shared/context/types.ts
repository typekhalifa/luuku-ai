export interface BusinessContext {

    company: string;

    contactName: string;

    objective: string;

    previousInteractions: string[];

    currentPriority:
        | "low"
        | "medium"
        | "high";

    executiveReasoning: string;

}