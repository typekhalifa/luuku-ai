import {
    ExecutiveIntegrationBoundary,
    InMemoryExternalActionRegistry,
    InMemoryIntegrationAuditStore,
    InMemoryIntegrationConcurrencyGate,
    type ExternalActionAdapter,
} from "../executive-integration-boundary.js";

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
    console.log(`✓ ${message}`);
}

async function main(): Promise<void> {
    const registry = new InMemoryExternalActionRegistry();
    const audit = new InMemoryIntegrationAuditStore();
    const concurrency = new InMemoryIntegrationConcurrencyGate();
    const adapters: Record<string, ExternalActionAdapter> = {
        "crm-sync": {
            async execute(input, credential) {
                if (input === "transient-failure") throw new Error("timeout from CRM");
                return { synced: true, credentialUsed: credential };
            },
        },
    };

    registry.register({
        id: "crm-sync",
        capability: "crm.write",
        requiresFounderApproval: false,
        validateInput: (input) => typeof input === "string" && input.length > 0,
        validateOutput: (output) =>
            typeof output === "object" && output !== null && (output as { synced?: unknown }).synced === true,
    });

    registry.register({
        id: "campaign-send",
        capability: "campaign.send",
        requiresFounderApproval: true,
        validateInput: (input) => typeof input === "string" && input.length > 0,
        validateOutput: (output) => output === "sent",
    });

    const boundary = new ExecutiveIntegrationBoundary({
        registry,
        credentials: {
            getCredential: (actionId) => actionId === "crm-sync" ? "demo-credential" : undefined,
        },
        concurrency,
        audit,
        adapters,
        classifyFailure: (error) => String(error).includes("timeout") ? "TRANSIENT" : "UNKNOWN",
    });

    const allowed = await boundary.execute({
        actionId: "crm-sync",
        capability: "crm.write",
        input: "customer-42",
        traceId: "trace-001",
    });
    assert(allowed.decision === "ALLOW", "validated external action is allowed");
    assert((allowed.output as { synced: boolean }).synced === true, "external output is returned only after validation");

    const approval = await boundary.execute({
        actionId: "campaign-send",
        capability: "campaign.send",
        input: "campaign-42",
        traceId: "trace-002",
    });
    assert(approval.decision === "APPROVAL", "approval-required action is blocked without founder approval");

    const mismatch = await boundary.execute({
        actionId: "crm-sync",
        capability: "crm.read",
        input: "customer-42",
        traceId: "trace-003",
    });
    assert(mismatch.decision === "DENY", "capability mismatch is denied");

    const invalid = await boundary.execute({
        actionId: "crm-sync",
        capability: "crm.write",
        input: "",
        traceId: "trace-004",
    });
    assert(invalid.decision === "INVALID", "invalid input is rejected before the adapter runs");

    const missingCredential = await boundary.execute({
        actionId: "campaign-send",
        capability: "campaign.send",
        input: "campaign-42",
        founderApproved: true,
        traceId: "trace-005",
    });
    assert(missingCredential.decision === "DENY" && missingCredential.failureClass === "AUTH", "missing credentials are denied as AUTH failures");

    const occupied = concurrency.tryAcquire("crm-sync");
    assert(occupied, "concurrency gate can reserve an external action");
    const rateLimited = await boundary.execute({
        actionId: "crm-sync",
        capability: "crm.write",
        input: "customer-43",
        traceId: "trace-006",
    });
    concurrency.release("crm-sync");
    assert(rateLimited.decision === "RATE_LIMITED", "concurrent external execution is bounded");

    const transient = await boundary.execute({
        actionId: "crm-sync",
        capability: "crm.write",
        input: "transient-failure",
        traceId: "trace-007",
    });
    assert(transient.decision === "FAILED" && transient.failureClass === "TRANSIENT", "external failures are classified");

    const unknown = await boundary.execute({
        actionId: "unknown-action",
        capability: "unknown",
        input: "anything",
        traceId: "trace-008",
    });
    assert(unknown.decision === "DENY", "unknown external actions are denied");

    assert(audit.list().length === 8, "every boundary decision produces audit evidence");
    assert(audit.list().find((record) => record.traceId === "trace-001")?.decision === "ALLOW", "decision trace identity is preserved in audit evidence");
    assert(audit.list().every((record) => record.actionId.length > 0), "audit records retain the external action identity");

    console.log(`Audit records        : ${audit.list().length}`);
    console.log("Integration boundary: PASS");
    console.log("Execution authority  : V6 remains downstream");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
