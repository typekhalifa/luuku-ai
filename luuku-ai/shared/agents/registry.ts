import { Agent } from "./interface";
import { AgentPresence } from "../communication/agent-presence";

const agents: Agent[] = [];
const presences = new Map<string, AgentPresence>();

export function registerAgent(
    agent: Agent,
    presence?: AgentPresence,
): void {
    agents.push(agent);

    if (presence) {
        if (presence.id !== agent.id) {
            throw new Error(
                `Agent presence id ${presence.id} does not match agent id ${agent.id}.`,
            );
        }

        presences.set(agent.id, presence);
    }
}

export function getAgents(): Agent[] {
    return agents;
}

export function getAgent(
    id: string,
): Agent | undefined {
    return agents.find(
        agent => agent.id === id,
    );
}

export function getAgentPresence(
    id: string,
): AgentPresence | undefined {
    return presences.get(id);
}

export function getRegisteredAgent(
    id: string,
): {
    agent: Agent;
    presence?: AgentPresence;
} | undefined {
    const agent = getAgent(id);

    if (!agent) {
        return undefined;
    }

    return {
        agent,
        presence: getAgentPresence(id),
    };
}
