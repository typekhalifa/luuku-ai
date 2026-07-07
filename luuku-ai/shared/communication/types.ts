export interface CommunicationBrief {

    contactName: string;

    company: string;

    objective: string;

    tone:
        | "professional"
        | "friendly"
        | "formal";

    keyTalkingPoints: string[];

    desiredOutcome: string;

}