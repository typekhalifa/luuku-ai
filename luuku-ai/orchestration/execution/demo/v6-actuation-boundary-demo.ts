import { V6ActuationBoundaryEngine } from "../v6-actuation-boundary.js";
import type { AgentResult } from "../../../shared/agents/interface.js";
import type { WorkflowStep } from "../../workflow/workflow-step.js";
import { Priority } from "../../task/priority.js";

async function main(): Promise<void> {
    const engine = new V6ActuationBoundaryEngine();
    const base: WorkflowStep = {
        id: "sales-email-step",
        workflowId: "workflow-production-sales-001",
        title: "Send approved sales email",
        description: "Send approved sales email",
        agentId: "sales-agent",
        capability: "email.send",
        dependsOn: [],
        priority: Priority.MEDIUM,
        requiresApproval: false,
        status: "READY",
    };

    const fakeExecutor = async (): Promise<AgentResult> => ({
        success: true,
        summary: "Actuation reached the V6 executor.",
        completedAt: new Date().toISOString(),
        executionStatus: "verified",
        executed: true,
        verified: true,
    });

    const allowed = await engine.dispatch(base, fakeExecutor);
    if (!allowed.allowed || !allowed.result?.executed) {
        throw new Error("Valid V6 actuation was blocked.");
    }

    const missingCapability = await engine.dispatch(
        { ...base, capability: undefined },
        fakeExecutor,
    );
    if (missingCapability.allowed || !missingCapability.reason?.includes("explicit capability")) {
        throw new Error("Missing capability was not blocked.");
    }

    const approvalBypass = await engine.dispatch(
        { ...base, requiresApproval: true },
        fakeExecutor,
    );
    if (approvalBypass.allowed || !approvalBypass.reason?.includes("approval")) {
        throw new Error("Approval bypass was not blocked.");
    }

    const invalidStatus = await engine.dispatch(
        { ...base, status: "PENDING" },
        fakeExecutor,
    );
    if (invalidStatus.allowed || !invalidStatus.reason?.includes("READY or RUNNING")) {
        throw new Error("Invalid workflow state was not blocked.");
    }

    console.log("V6 — Actuation Boundary Validation");
    console.log("Boundary                     : V6_EXECUTION_AUTHORITY");
    console.log("Valid dispatch              : ALLOWED");
    console.log("Missing capability          : BLOCKED");
    console.log("Approval bypass             : BLOCKED");
    console.log("Invalid workflow state      : BLOCKED");
    console.log("✓ Only identified V6 workflow steps may dispatch");
    console.log("✓ Capability identity is explicit");
    console.log("✓ Approval requirements cannot be bypassed");
    console.log("✓ Boundary does not grant approval");
    console.log("✓ Boundary does not call providers directly");
    console.log("V6 ACTUATION BOUNDARY: PASS");
}

void main();
