import crypto from "crypto";
import { Task } from "../types/task";

export function createFollowUpTask(

    business: string,

    days: number

): Task {

    const due = new Date();

    due.setDate(
        due.getDate() + days
    );

    return {

        id: crypto.randomUUID(),

        business,

        title: "Follow-up",

        description:
            `Follow up with ${business}`,

        assignedBy: "Sales Agent",

        assignedTo: "Executive AI",

        dueDate: due.toISOString(),

        priority: "medium",

        status: "pending",

        createdAt:
            new Date().toISOString()

    };

}