import { Agent } from "./interface";

const agents: Agent[] = [];

export function registerAgent(

    agent: Agent

): void {

    agents.push(agent);

}

export function getAgents(): Agent[] {

    return agents;

}

export function getAgent(

    id: string

): Agent | undefined {

    return agents.find(

        agent => agent.id === id

    );

}