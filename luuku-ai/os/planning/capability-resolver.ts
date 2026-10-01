import { AgentDiscovery } from "../agents/discovery.js";

export interface CapabilityRequest {
    capability: string;
}

export interface CapabilityResolution {
    capability: string;
    agentId: string;
    agentName: string;
}

export class CapabilityResolver {
    constructor(private readonly discovery: AgentDiscovery) {}

    resolve(request: CapabilityRequest): CapabilityResolution | undefined {
        const agent = this.discovery.findByCapability(request.capability);
        if (!agent) return undefined;
        return { capability: request.capability, agentId: agent.id, agentName: agent.name };
    }
}
