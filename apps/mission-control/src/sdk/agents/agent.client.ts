import { api } from "@/sdk/client";

import type { Agent } from "@/features/agents/types/agent";

export class AgentClient {

    async getAgents(): Promise<Agent[]> {

        return api.get("/agents");

    }

}

export const agentClient =
    new AgentClient();