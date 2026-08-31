import { AgentRegistry } from "../agents/registry.js";
import { ToolRegistry } from "./registry.js";

export class AgentToolAccess {
    private readonly access = new Map<string, Set<string>>();

    constructor(private readonly agents: AgentRegistry, private readonly tools: ToolRegistry) {}

    grant(agentId: string, toolId: string): void {
        if (!this.agents.get(agentId)) throw new Error(`Unknown agent: ${agentId}`);
        if (!this.tools.get(toolId)) throw new Error(`Unknown tool: ${toolId}`);
        const tools = this.access.get(agentId) ?? new Set<string>();
        tools.add(toolId);
        this.access.set(agentId, tools);
    }

    canUse(agentId: string, toolId: string): boolean {
        return this.access.get(agentId)?.has(toolId) ?? false;
    }

    listTools(agentId: string): readonly string[] {
        return [...(this.access.get(agentId) ?? new Set<string>())];
    }
}
