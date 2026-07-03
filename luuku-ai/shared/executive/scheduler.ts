export interface ExecutiveSchedule {

    name: string;

    description: string;

    hour: number;

}

export function buildExecutiveSchedule():

    ExecutiveSchedule[] {

    return [

        {

            name: "Morning Review",

            description:

                "Review company status and assign priorities.",

            hour: 8

        },

        {

            name: "Midday Review",

            description:

                "Check agent progress and adjust priorities.",

            hour: 13

        },

        {

            name: "Evening Review",

            description:

                "Summarize completed work and prepare tomorrow.",

            hour: 18

        }

    ];

}