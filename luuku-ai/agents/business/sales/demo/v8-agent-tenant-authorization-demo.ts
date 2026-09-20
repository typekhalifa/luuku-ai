import { executeSalesWorkflow } from "../../../agents/business/sales/workflow";

async function main(): Promise<void> {
    const result = await executeSalesWorkflow({
        id: "v8-agent-tenant-guard-test",
        title: "Test CRM follow-up",
        description: "Email follow-up test",
        priority: "high",
        metadata: { operation: "email.send" },
    });

    if (result.executionStatus !== "blocked" || result.executed || result.verified) {
        throw new Error("Sales agent did not fail closed without tenant context.");
    }

    if (!result.blockers?.includes("TENANT_CONTEXT_REQUIRED")) {
        throw new Error("Missing deterministic tenant-context blocker.");
    }

    console.log("✓ Sales agent blocks CRM execution without tenant context");
    console.log("V8 AGENT TENANT AUTHORIZATION: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
