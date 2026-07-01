export interface Agent {

    id: string;

    name: string;

    version: string;

    description: string;

    capabilities: string[];

}

export const registry: Agent[] = [

    {

        id: "research",

        name: "Research Agent",

        version: "0.7.5",

        description:
            "Researches businesses and validates opportunities.",

        capabilities: [

            "research",

            "validation"

        ]

    },

    {

        id: "sales",

        name: "Sales Agent",

        version: "0.9",

        description:
            "Handles prospect outreach and pipeline updates.",

        capabilities: [

            "sales",

            "follow-up"

        ]

    }

];