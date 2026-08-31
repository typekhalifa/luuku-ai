export interface ToolDefinition {
    id: string;
    name: string;
    description: string;
}

export class ToolRegistry {
    private readonly tools = new Map<string, ToolDefinition>();

    register(tool: ToolDefinition): void {
        if (this.tools.has(tool.id)) {
            throw new Error(`Tool already registered: ${tool.id}`);
        }
        this.tools.set(tool.id, tool);
    }

    get(toolId: string): ToolDefinition | undefined {
        return this.tools.get(toolId);
    }

    list(): readonly ToolDefinition[] {
        return [...this.tools.values()];
    }
}
