import type {
    RuntimeAgent,
} from "../types/runtime";

export async function getRuntimeAgents():

Promise<RuntimeAgent[]> {

    return [

        {

            id: "executive",

            name: "Executive AI",

            status: "online",

            skills: [

                "planning",

                "coordination",

            ],

            heartbeat: "now",

        },

        {

            id: "research",

            name: "Research AI",

            status: "busy",

            currentTask:

                "Finding fintech companies",

            skills: [

                "research",

                "internet",

            ],

            heartbeat: "2 sec",

        },

        {

            id: "sales",

            name: "Sales AI",

            status: "online",

            skills: [

                "crm",

                "email",

                "calls",

            ],

            heartbeat: "3 sec",

        },

    ];

}