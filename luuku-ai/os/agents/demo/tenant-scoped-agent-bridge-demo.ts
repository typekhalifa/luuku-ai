import assert from "node:assert/strict";
import type { Agent, AgentTask } from "../../../shared/agents/interface.js";
import { AgentRegistry } from "../registry.js";
import { AgentDiscovery } from "../discovery.js";
import { CapabilityResolver } from "../../planning/capability-resolver.js";
import { createTenantScopedAgentAdapter } from "../tenant-scoped-agent.js";

const companyId = "company-alpha";
const receivedTasks: AgentTask[] = [];
const canonicalSalesAgent: Agent = {
    id: "sales",
    name: "Sales Agent",
    role: "Sales",
    async execute(task) {
        receivedTasks.push(task);
        return {
            success: true,
            summary: "Fake Sales Agent accepted the tenant-scoped task.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: false,
            verified: false,
        };
    },
};

const registry = new AgentRegistry();
registry.register({
    agent: createTenantScopedAgentAdapter(canonicalSalesAgent, companyId),
    capabilities: ["email.send"],
});

const resolver = new CapabilityResolver(new AgentDiscovery(registry));
const resolution = resolver.resolve({ capability: "email.send" });
assert.deepEqual(resolution, {
    capability: "email.send",
    agentId: "sales",
    agentName: "Sales Agent",
});

const adapter = registry.get("sales")?.agent;
assert.ok(adapter, "Tenant-scoped Sales Agent adapter must be registered.");

const validTask: AgentTask = {
    id: "tenant-bridge-valid",
    title: "Controlled test task",
    description: "No external communication; fake agent only.",
    priority: "low",
    metadata: { companyId },
};
const accepted = await adapter.execute(validTask);
assert.equal(accepted.success, true);
assert.equal(receivedTasks.length, 1);
assert.equal(receivedTasks[0]?.metadata?.companyId, companyId);

const foreignTenantTask: AgentTask = {
    ...validTask,
    id: "tenant-bridge-foreign",
    metadata: { companyId: "company-beta" },
};
const rejected = await adapter.execute(foreignTenantTask);
assert.equal(rejected.success, false);
assert.equal(rejected.executionStatus, "blocked");
assert.deepEqual(rejected.blockers, ["TENANT_OWNERSHIP_MISMATCH"]);
assert.equal(receivedTasks.length, 1, "Foreign-tenant task must never reach canonical agent.");

const missingTenantTask: AgentTask = {
    ...validTask,
    id: "tenant-bridge-missing",
    metadata: {},
};
const missingTenant = await adapter.execute(missingTenantTask);
assert.equal(missingTenant.success, false);
assert.deepEqual(missingTenant.blockers, ["TENANT_OWNERSHIP_MISMATCH"]);
assert.equal(receivedTasks.length, 1, "Missing tenant context must never reach canonical agent.");

console.log("PHASE 4 TENANT-SCOPED SALES BRIDGE");
console.log("✓ Capability discovery resolves the canonical Sales Agent identity.");
console.log("✓ Matching companyId is delegated to the canonical agent.");
console.log("✓ Foreign companyId is blocked before delegation.");
console.log("✓ Missing companyId is blocked before delegation.");
console.log("✓ No database, CRM, provider, or external communication was used.");
