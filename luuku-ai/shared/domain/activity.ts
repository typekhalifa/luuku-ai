export type ActivityType =
    | "call"
    | "email"
    | "meeting"
    | "note"
    | "task";

export interface Activity {

    id: string;

    companyId: string;

    contactId?: string;

    dealId?: string;

    type: ActivityType;

    title: string;

    description: string;

    outcome?: string;

    createdBy: string;

    createdAt: string;

}