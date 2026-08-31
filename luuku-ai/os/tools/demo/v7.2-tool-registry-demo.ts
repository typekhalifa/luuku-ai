import assert from "node:assert/strict";
import { ToolRegistry } from "../registry.js";

async function main() {
    const registry = new ToolRegistry();

    registry.register({ id: "crm", name: "CRM", description: "Customer relationship management" });
    registry.register({ id: "email", name: "Email", description: "Company email" });
    registry.register({ id: "payments", name: "Payments", description: "Payment processing" });

    assert.equal(registry.list().length, 3);
    assert.equal(registry.get("crm")?.name, "CRM");
    assert.equal(registry.get("email")?.description, "Company email");
    assert.equal(registry.get("missing"), undefined);
    assert.throws(() => registry.register({ id: "crm", name: "Duplicate CRM", description: "Duplicate" }), /Tool already registered/);

    console.log("");
    console.log("========================================");
    console.log(" V7.2 TOOL REGISTRY DEMO");
    console.log("========================================");
    console.log("");
    console.log("Registered : CRM + Email + Payments");
    console.log("Lookup     : crm → CRM");
    console.log("Unknown    : safely unresolved");
    console.log("Duplicates : rejected deterministically");
    console.log("");
    console.log("✓ Tools register through a stable tool definition.");
    console.log("✓ The OS can enumerate and resolve registered tools.");
    console.log("✓ Unknown tools remain unresolved instead of guessing.");
    console.log("✓ Duplicate tool IDs are rejected deterministically.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
