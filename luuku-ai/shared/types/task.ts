export interface Task {

    id: string;

    relatedProspectId?: string;

    business: string;

    title: string;

    description: string;

    assignedBy: string;

    /** Legacy persisted assignment field used by existing task JSON records. */
    assignedTo?: string;

    /** Agent currently assigned to execute the task. */
    assignedAgent?: string;

    dueDate: string;

    priority:
        | "low"
        | "medium"
        | "high";

    status:
        | "created"
        | "pending"
        | "assigned"
        | "in-progress"
        | "completed"
        | "cancelled"
        | "archived";

    createdAt: string;

    completedAt?: string;

}