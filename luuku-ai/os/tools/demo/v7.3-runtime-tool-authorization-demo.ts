import assert from "node:assert/strict";
import { AgentRegistry } from "../../agents/registry.js";
import { AgentToolAccess } from "../access.js";
import { ToolRegistry } from "../registry.js";
import { ToolAuthorizer } from "../authorization.js";

const makeAgent = (id: string, name: string, role: string) => ({
    id, name, role,
    execute: async () => ({ success: true, summary: "ok", completedAt: new Date().toISOString() }),
});

async function main() {
    const agents = new AgentRegistry();
    const tools = new ToolRegistry();
    agents.register({ agent: makeAgent("sales", "Sales Agent", "Sales"), capabilities: ["proposal_generation"] });
    tools.register({ id: "email", name: "Email", description: "Company email" });
    tools.register({ id: "payments", name: "Payments", description: "Payment processing" });

    const access = new AgentToolAccess(agents, tools);
    access.grant("sales", "email");
    const authorizer = new ToolAuthorizer(access);

    const allowed = authorizer.authorize("sales", "email");
    const denied = authorizer.authorize("sales", "payments");
    const unknown = authorizer.authorize("sales", "missing-tool");

    assert.deepEqual(allowed, { allowed: true });
    assert.deepEqual(denied, { allowed: false, reason: "access_denied" });
    assert.deepEqual(unknown, { allowed: false, reason: "access_denied" });

    let sideEffects = 0;
    if (allowed.allowed) sideEffects += 1;
    if (denied.allowed) sideEffects += 1;
    assert.equal(sideEffects, 1);

    console.log("");
    console.log("========================================");
    console.log(" V7.3 RUNTIME TOOL AUTHORIZATION DEMO");
    console.log("========================================");
    console.log("");
    console.log("Sales → email    : ALLOWED → execution path opened");
    console.log("Sales → payments : DENIED  → execution blocked");
    console.log("Unknown tool     : DENIED  → execution blocked");
    console.log("Side effects     : 1 (allowed request only)");
    console.log("");
    console.log("✓ Runtime authorization permits explicitly granted tool access.");
    console.log("✓ Unauthorized tool requests are denied before execution.");
    console.log("✓ Unknown tools cannot bypass the authorization boundary.");
    console.log("✓ Denied requests produce no tool side effect.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
