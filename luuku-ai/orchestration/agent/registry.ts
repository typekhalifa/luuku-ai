import { Capability } from "./capability";
import { Agent } from "./agent";

export interface AgentRegistry {

    register(agent: Agent): void;

    unregister(id: string): void;

    get(id: string): Agent | undefined;

    findByCapability(capability: Capability): Agent | undefined;

    all(): Agent[];

}