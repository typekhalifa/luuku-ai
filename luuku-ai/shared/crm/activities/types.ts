export interface Activity {

    id: string;

    company: string;

    contact: string;

    type:
        | "call"
        | "email"
        | "meeting"
        | "note";

    title: string;

    description: string;

    outcome: string;

    createdBy: string;

    createdAt: string;

}