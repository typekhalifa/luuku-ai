import { AgentToolAccess } from "./access.js";

export type ToolAuthorizationDecision =
    | { allowed: true }
    | { allowed: false; reason: "unknown_agent" | "unknown_tool" | "access_denied" };

export class ToolAuthorizer {
    constructor(private readonly access: AgentToolAccess) {}

    authorize(agentId: string, toolId: string): ToolAuthorizationDecision {
        try {
            if (!this.access.canUse(agentId, toolId)) {
                return { allowed: false, reason: "access_denied" };
            }
            return { allowed: true };
        } catch {
            return { allowed: false, reason: "access_denied" };
        }
    }
}
