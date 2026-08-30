import assert from "node:assert/strict";

import { Priority } from "../../task/priority";
import { WorkflowStatus } from "../workflow-status";
import { WorkflowEngine } from "../workflow-engine";
import { Workflow } from "../workflow";

const workflow: Workflow = {
    id: "v6-demo-onboard-company-x",
    goal: "Prepare Company X for founder-approved onboarding.",
    status: WorkflowStatus.READY,
    requiresFounderApproval: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
        source: "v6-workflow-foundation-demo",
    },
    steps: [
        {
            id: "research-company",
            title: "Research Company X",
            description: "Research the prospect and produce an actionable company brief.",
            agentId: "research",
            capability: "research.company",
            dependsOn: [],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "PENDING",
        },
        {
            id: "prepare-proposal",
            title: "Prepare Proposal",
            description: "Create a proposal using the completed research brief.",
            agentId: "sales",
            capability: "sales.proposal",
            dependsOn: ["research-company"],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "PENDING",
        },
        {
            id: "send-proposal",
            title: "Send Proposal",
            description: "Send the approved proposal to Company X.",
            agentId: "sales",
            capability: "email.send",
            dependsOn: ["prepare-proposal"],
            priority: Priority.HIGH,
            requiresApproval: true,
            status: "PENDING",
        },
    ],
};

const engine = new WorkflowEngine();

console.log("");
console.log("========================================");
console.log("      V6 WORKFLOW FOUNDATION DEMO");
console.log("========================================");
console.log("");
console.log(`Goal: ${workflow.goal}`);
console.log(`Workflow status: ${workflow.status}`);
console.log("");

let decision = engine.evaluate(workflow);

console.log("Initial decision:");
console.log(`  Runnable : ${decision.runnableStepIds.join(", ") || "none"}`);
console.log(`  Waiting  : ${decision.waitingStepIds.join(", ") || "none"}`);
console.log(`  Blocked  : ${decision.blockedStepIds.join(", ") || "none"}`);
console.log(`  Approval : ${decision.requiresApproval}`);

assert.deepEqual(decision.runnableStepIds, ["research-company"]);
assert.deepEqual(decision.waitingStepIds, ["prepare-proposal", "send-proposal"]);
assert.deepEqual(decision.blockedStepIds, []);
assert.equal(decision.requiresApproval, false);

workflow.steps[0].status = "COMPLETED";
workflow.steps[0].output = {
    company: "Company X",
    findings: ["qualified prospect"],
};

decision = engine.evaluate(workflow);

console.log("");
console.log("After research completion:");
console.log(`  Runnable : ${decision.runnableStepIds.join(", ") || "none"}`);
console.log(`  Waiting  : ${decision.waitingStepIds.join(", ") || "none"}`);
console.log(`  Blocked  : ${decision.blockedStepIds.join(", ") || "none"}`);

assert.deepEqual(decision.runnableStepIds, ["prepare-proposal"]);
assert.deepEqual(decision.waitingStepIds, ["send-proposal"]);
assert.deepEqual(decision.blockedStepIds, []);

workflow.steps[1].status = "COMPLETED";
workflow.steps[1].output = {
    proposalReady: true,
};

workflow.status = WorkflowStatus.AWAITING_APPROVAL;
workflow.updatedAt = new Date();

decision = engine.evaluate(workflow);

console.log("");
console.log("After proposal preparation:");
console.log(`  Runnable : ${decision.runnableStepIds.join(", ") || "none"}`);
console.log(`  Waiting  : ${decision.waitingStepIds.join(", ") || "none"}`);
console.log(`  Blocked  : ${decision.blockedStepIds.join(", ") || "none"}`);
console.log(`  Approval : ${decision.requiresApproval}`);

assert.deepEqual(decision.runnableStepIds, []);
assert.deepEqual(decision.waitingStepIds, []);
assert.deepEqual(decision.blockedStepIds, ["send-proposal"]);
assert.equal(decision.requiresApproval, true);

workflow.status = WorkflowStatus.READY;
workflow.approvedAt = new Date();
workflow.updatedAt = new Date();

decision = engine.evaluate(workflow);

console.log("");
console.log("After founder approval:");
console.log(`  Runnable : ${decision.runnableStepIds.join(", ") || "none"}`);
console.log(`  Waiting  : ${decision.waitingStepIds.join(", ") || "none"}`);
console.log(`  Blocked  : ${decision.blockedStepIds.join(", ") || "none"}`);
console.log(`  Approval : ${decision.requiresApproval}`);

assert.deepEqual(decision.runnableStepIds, ["send-proposal"]);
assert.deepEqual(decision.waitingStepIds, []);
assert.deepEqual(decision.blockedStepIds, []);
assert.equal(decision.requiresApproval, false);

console.log("");
console.log("✓ V6 workflow dependency and approval lifecycle verified.");
console.log("✓ No agent or external provider was executed.");
console.log("");
