import { Agent } from "./agent";
import { Capability } from "./capability";
import { AgentRegistry } from "./registry";

export class InMemoryAgentRegistry implements AgentRegistry {

    private readonly agents = new Map<string, Agent>();

    register(agent: Agent): void {

        this.agents.set(agent.id, agent);

    }

    unregister(id: string): void {

        this.agents.delete(id);

    }

    get(id: string): Agent | undefined {

        return this.agents.get(id);

    }

    all(): Agent[] {

        return Array.from(this.agents.values());

    }

    findByCapability(capability: Capability): Agent | undefined {

        return this.all().find(

            (agent) => agent.capabilities.includes(capability),

        );

    }

}

