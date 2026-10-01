import assert from "node:assert/strict";
import { Agent, AgentResult, AgentTask } from "../../../shared/agents/interface.js";
import { AgentDiscovery } from "../discovery.js";
import { AgentRegistry } from "../registry.js";

class DemoAgent implements Agent {
    constructor(public readonly id: string, public readonly name: string, public readonly role: string) {}
    async execute(task: AgentTask): Promise<AgentResult> {
        return { success: true, summary: `${this.id} handled ${task.title}`, completedAt: new Date().toISOString() };
    }
}

async function main() {
    const registry = new AgentRegistry();
    registry.register({ agent: new DemoAgent("research", "Research Agent", "Research"), capabilities: ["company_research", "market_analysis"] });
    registry.register({ agent: new DemoAgent("sales", "Sales Agent", "Sales"), capabilities: ["prospecting", "proposal_generation"] });

    const discovery = new AgentDiscovery(registry);
    const agents = discovery.list();
    const research = discovery.get("research");
    const proposalOwner = discovery.findByCapability("proposal_generation");

    assert.equal(agents.length, 2);
    assert.deepEqual(research, {
        id: "research", name: "Research Agent", role: "Research",
        capabilities: ["company_research", "market_analysis"],
    });
    assert.equal(proposalOwner?.id, "sales");
    assert.equal(proposalOwner?.name, "Sales Agent");
    assert.equal(discovery.get("missing"), undefined);
    assert.equal(discovery.findByCapability("missing_capability"), undefined);

    console.log("");
    console.log("========================================");
    console.log(" V7.1 AGENT DISCOVERY DEMO");
    console.log("========================================");
    console.log("");
    console.log("Agents          : Research + Sales");
    console.log("Research lookup : metadata + capabilities returned");
    console.log("Capability      : proposal_generation → Sales Agent");
    console.log("Unknown agent   : safely unresolved");
    console.log("Unknown skill   : safely unresolved");
    console.log("");
    console.log("✓ The OS can enumerate registered agents.");
    console.log("✓ Agent metadata and capabilities are discoverable through a dedicated service.");
    console.log("✓ Capabilities resolve to agents without exposing registry internals.");
    console.log("✓ Unknown agents and capabilities remain unresolved instead of guessing.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
