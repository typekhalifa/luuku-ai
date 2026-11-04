import type { Agent } from "../../shared/agents/interface.js";

/**
 * Binds a canonical agent implementation to one tenant for OS capability
 * discovery. This adapter is a tenant guard, not an execution authority:
 * production side effects must still pass through the V6 actuator boundary.
 */
export function createTenantScopedAgentAdapter(
    canonicalAgent: Agent,
    companyId: string,
): Agent {
    if (!companyId.trim()) {
        throw new Error("Tenant-scoped agent adapter requires a companyId.");
    }

    return {
        id: canonicalAgent.id,
        name: canonicalAgent.name,
        role: canonicalAgent.role,
        async execute(task) {
            if (task.metadata?.companyId !== companyId) {
                return {
                    success: false,
                    summary: "Agent adapter rejected a task outside its tenant ownership.",
                    completedAt: new Date().toISOString(),
                    executionStatus: "blocked",
                    executed: false,
                    verified: false,
                    blockers: ["TENANT_OWNERSHIP_MISMATCH"],
                };
            }

            return canonicalAgent.execute(task);
        },
    };
}
