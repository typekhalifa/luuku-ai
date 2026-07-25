export class AgentApplication {

    async getAgents() {

        return [

            {
                id: "research",
                name: "Research Agent",
                status: "running",
                task: "Researching prospects",
            },

            {
                id: "executive",
                name: "Executive Agent",
                status: "running",
                task: "Reviewing opportunities",
            },

            {
                id: "sales",
                name: "Sales Agent",
                status: "idle",
                task: "Waiting",
            },

        ];

    }

}

export const agentApplication =
    new AgentApplication();