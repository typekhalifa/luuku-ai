export interface Task {

    id: string;

    relatedProspectId?: string;

    business: string;

    title: string;

    description: string;

    assignedBy: string;

    assignedAgent?: string;

    dueDate: string;

    priority:
        | "low"
        | "medium"
        | "high";

    status:
        | "created"
        | "assigned"
        | "in-progress"
        | "completed"
        | "cancelled"
        | "archived";

    createdAt: string;

    completedAt?: string;

}