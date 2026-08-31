import assert from "node:assert/strict";
import { AgentRegistry } from "../../agents/registry.js";
import { AgentToolAccess } from "../access.js";
import { ToolRegistry } from "../registry.js";

const agent = (id: string, name: string, role: string) => ({ id, name, role, execute: async () => ({ success: true, summary: "ok", completedAt: new Date().toISOString() }) });

async function main() {
    const agents = new AgentRegistry();
    const tools = new ToolRegistry();
    const research = agent("research", "Research Agent", "Research");
    const sales = agent("sales", "Sales Agent", "Sales");

    agents.register({ agent: research, capabilities: ["company_research"] });
    agents.register({ agent: sales, capabilities: ["proposal_generation"] });
    tools.register({ id: "web_search", name: "Web Search", description: "Search public web sources" });
    tools.register({ id: "crm", name: "CRM", description: "Customer relationship management" });
    tools.register({ id: "email", name: "Email", description: "Company email" });
    tools.register({ id: "payments", name: "Payments", description: "Payment processing" });

    const access = new AgentToolAccess(agents, tools);
    access.grant("research", "web_search");
    access.grant("sales", "crm");
    access.grant("sales", "email");

    assert.equal(access.canUse("research", "web_search"), true);
    assert.equal(access.canUse("research", "payments"), false);
    assert.equal(access.canUse("sales", "crm"), true);
    assert.equal(access.canUse("sales", "email"), true);
    assert.equal(access.canUse("sales", "payments"), false);
    assert.deepEqual(access.listTools("sales"), ["crm", "email"]);
    assert.throws(() => access.grant("missing-agent", "crm"), /Unknown agent/);
    assert.throws(() => access.grant("sales", "missing-tool"), /Unknown tool/);

    console.log("");
    console.log("========================================");
    console.log(" V7.2 AGENT ↔ TOOL ACCESS DEMO");
    console.log("========================================");
    console.log("");
    console.log("Research : web_search ✓ | payments ✗");
    console.log("Sales    : crm ✓ | email ✓ | payments ✗");
    console.log("Unknown  : invalid agent/tool rejected");
    console.log("");
    console.log("✓ Tool access is explicitly granted per agent.");
    console.log("✓ Agents cannot use tools they were not granted.");
    console.log("✓ Access mapping is independent from capability ownership.");
    console.log("✓ Unknown agents and tools are rejected instead of guessed.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
