export interface ExecutiveObjective {

    title: string;

    description: string;

    priority:
        | "high"
        | "medium"
        | "low";

}

export function buildExecutiveObjectives():

    ExecutiveObjective[] {

    return [

        {

            title:

                "Close Qualified Prospects",

            description:

                "Prioritize converting high-quality prospects into meetings and customers.",

            priority: "high"

        },

        {

            title:

                "Maintain Operational Momentum",

            description:

                "Ensure no critical tasks remain overdue.",

            priority: "high"

        },

        {

            title:

                "Improve Agent Efficiency",

            description:

                "Keep agents productive while avoiding overload.",

            priority: "medium"

        }

    ];

}