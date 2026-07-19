import type {

    ExecutionPlan,

} from "../types/plan";

export async function createExecutionPlan(

    goal: string

): Promise<ExecutionPlan> {

    return {

        goal,

        steps: [

            {

                id: "1",

                title: "Research companies",

                assignedTo: "Research AI",

            },

            {

                id: "2",

                title: "Score prospects",

                assignedTo: "Sales AI",

            },

            {

                id: "3",

                title: "Generate report",

                assignedTo: "Executive AI",

            },

        ],

    };

}