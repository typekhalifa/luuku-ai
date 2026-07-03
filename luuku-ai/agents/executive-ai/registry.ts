export interface Agent {

    id: string;

    name: string;

    role: string;

    version: string;

    description: string;

    capabilities: string[];

}

export const registry: Agent[] = [

    {

        id: "research",

        name: "Research Agent",

        role: "Research",

        version: "0.9.9",

        description:
            "Researches businesses, validates opportunities, and generates intelligence.",

        capabilities: [

            "research",

            "validation",

            "prospecting"

        ]

    },

    {

        id: "sales",

        name: "Sales Agent",

        role: "Sales",

        version: "0.9.9",

        description:
            "Handles outreach, pipeline updates, and follow-ups.",

        capabilities: [

            "sales",

            "follow-up",

            "outreach"

        ]

    }

];