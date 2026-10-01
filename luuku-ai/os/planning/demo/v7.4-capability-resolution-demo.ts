import assert from "node:assert/strict";
import { AgentDiscovery } from "../../agents/discovery.js";
import { AgentRegistry } from "../../agents/registry.js";
import { CapabilityResolver } from "../capability-resolver.js";

const makeAgent = (id: string, name: string, role: string) => ({
    id, name, role,
    execute: async () => ({ success: true, summary: "ok", completedAt: new Date().toISOString() }),
});

async function main() {
    const registry = new AgentRegistry();
    registry.register({ agent: makeAgent("research", "Research Agent", "Research"), capabilities: ["company_research", "market_analysis"] });
    registry.register({ agent: makeAgent("sales", "Sales Agent", "Sales"), capabilities: ["proposal_generation"] });

    const resolver = new CapabilityResolver(new AgentDiscovery(registry));
    const research = resolver.resolve({ capability: "company_research" });
    const proposal = resolver.resolve({ capability: "proposal_generation" });
    const unknown = resolver.resolve({ capability: "unknown_capability" });

    assert.deepEqual(research, { capability: "company_research", agentId: "research", agentName: "Research Agent" });
    assert.deepEqual(proposal, { capability: "proposal_generation", agentId: "sales", agentName: "Sales Agent" });
    assert.equal(unknown, undefined);

    console.log("");
    console.log("========================================");
    console.log(" V7.4 PLANNER → OS CAPABILITY RESOLUTION DEMO");
    console.log("========================================");
    console.log("");
    console.log("Planner request : company_research");
    console.log("Resolved agent  : Research Agent");
    console.log("Planner request : proposal_generation");
    console.log("Resolved agent  : Sales Agent");
    console.log("Unknown request : safely unresolved");
    console.log("");
    console.log("✓ Planner requests resolve through the OS discovery boundary.");
    console.log("✓ Capability resolution returns stable agent identity without hard-coding classes.");
    console.log("✓ Unknown capabilities remain unresolved instead of guessing.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
