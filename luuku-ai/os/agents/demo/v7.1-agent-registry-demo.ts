import assert from "node:assert/strict";
import { Agent, AgentResult, AgentTask } from "../../../shared/agents/interface.js";
import { AgentRegistry } from "../registry.js";

class DemoAgent implements Agent {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly role: string,
    ) {}

    async execute(task: AgentTask): Promise<AgentResult> {
        return { success: true, summary: `${this.id} handled ${task.title}`, completedAt: new Date().toISOString() };
    }
}

async function main() {
    const registry = new AgentRegistry();
    const research = new DemoAgent("research", "Research Agent", "Research");
    const sales = new DemoAgent("sales", "Sales Agent", "Sales");

    registry.register({ agent: research, capabilities: ["company_research", "market_analysis"] });
    registry.register({ agent: sales, capabilities: ["prospecting", "proposal_generation"] });

    assert.equal(registry.get("research")?.agent, research);
    assert.equal(registry.resolveCapability("company_research")?.agent, research);
    assert.equal(registry.resolveCapability("proposal_generation")?.agent, sales);
    assert.equal(registry.resolveCapability("unknown_capability"), undefined);
    assert.throws(() => registry.register({ agent: research, capabilities: ["duplicate"] }), /Agent already registered/);
    assert.throws(() => registry.register({ agent: new DemoAgent("legal", "Legal Agent", "Legal"), capabilities: ["proposal_generation"] }), /Capability already owned/);

    console.log("");
    console.log("========================================");
    console.log(" V7.1 AGENT REGISTRY DEMO");
    console.log("========================================");
    console.log("");
    console.log("Registered      : Research + Sales");
    console.log("Capability      : company_research → Research Agent");
    console.log("Capability      : proposal_generation → Sales Agent");
    console.log("Unknown lookup  : safely unresolved");
    console.log("Duplicate rules : agent + capability ownership enforced");
    console.log("");
    console.log("✓ Agents register through the shared Agent contract.");
    console.log("✓ Capabilities resolve to agents without hard-coding agent classes.");
    console.log("✓ Unknown capabilities remain unresolved instead of guessing.");
    console.log("✓ Duplicate agent IDs are rejected deterministically.");
    console.log("✓ Duplicate capability ownership is rejected deterministically.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
