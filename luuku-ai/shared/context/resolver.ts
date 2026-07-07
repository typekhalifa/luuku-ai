import { AgentTask } from "../agents/interface";

export interface TaskContext {

    company: string;

    contactType: string;

}

export function resolveTaskContext(

    task: AgentTask

): TaskContext {

    const text = (

        task.title +

        " " +

        task.description

    ).toLowerCase();

    if (

        text.includes("rwanda revenue authority") ||

        text.includes("rra")

    ) {

        return {

            company:

                "Rwanda Revenue Authority",

            contactType:

                "Procurement"

        };

    }

    if (

        text.includes("bk") ||

        text.includes("bank of kigali")

    ) {

        return {

            company:

                "Bank of Kigali",

            contactType:

                "Innovation"

        };

    }

    return {

        company: "Unknown",

        contactType: "General"

    };

}