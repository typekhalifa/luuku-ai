import { AgentRegistration, AgentRegistry } from "./registry.js";

export interface AgentDescriptor {
    id: string;
    name: string;
    role: string;
    capabilities: readonly string[];
}

export class AgentDiscovery {
    constructor(private readonly registry: AgentRegistry) {}

    list(): readonly AgentDescriptor[] {
        return this.registry.list().map(this.describe);
    }

    get(agentId: string): AgentDescriptor | undefined {
        const registration = this.registry.get(agentId);
        return registration ? this.describe(registration) : undefined;
    }

    findByCapability(capability: string): AgentDescriptor | undefined {
        const registration = this.registry.resolveCapability(capability);
        return registration ? this.describe(registration) : undefined;
    }

    private readonly describe = (registration: AgentRegistration): AgentDescriptor => ({
        id: registration.agent.id,
        name: registration.agent.name,
        role: registration.agent.role,
        capabilities: [...registration.capabilities],
    });
}
