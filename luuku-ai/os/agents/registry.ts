import { Agent } from "../../shared/agents/interface.js";

export interface AgentRegistration {
    agent: Agent;
    capabilities: readonly string[];
}

export class AgentRegistry {
    private readonly agents = new Map<string, AgentRegistration>();
    private readonly capabilityIndex = new Map<string, string>();

    register(registration: AgentRegistration): void {
        if (this.agents.has(registration.agent.id)) {
            throw new Error(`Agent already registered: ${registration.agent.id}`);
        }
        for (const capability of registration.capabilities) {
            const existing = this.capabilityIndex.get(capability);
            if (existing && existing !== registration.agent.id) {
                throw new Error(`Capability already owned: ${capability}`);
            }
        }
        this.agents.set(registration.agent.id, registration);
        for (const capability of registration.capabilities) {
            this.capabilityIndex.set(capability, registration.agent.id);
        }
    }

    get(agentId: string): AgentRegistration | undefined {
        return this.agents.get(agentId);
    }

    resolveCapability(capability: string): AgentRegistration | undefined {
        const agentId = this.capabilityIndex.get(capability);
        return agentId ? this.agents.get(agentId) : undefined;
    }

    list(): readonly AgentRegistration[] {
        return [...this.agents.values()];
    }
}
