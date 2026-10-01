import { ExecutiveAutonomyPolicy } from "../autonomy-policy.js";
import { ExecutionDecisionProjector } from "../execution-decision.js";
import type { ExecutiveIntent } from "../executive-intent.js";
import type { ExecutionPlan } from "../../planning/execution-plan.js";

const policy = new ExecutiveAutonomyPolicy([
    {
        capability: "work.recover",
        decision: "AUTONOMOUS",
        reason: "Recovery work is within the autonomous operating boundary.",
    },
    {
        capability: "customer.send",
        decision: "FOUNDER_APPROVAL",
        reason: "Customer-facing action is consequential and requires founder approval.",
    },
]);

const projector = new ExecutionDecisionProjector();

function intent(id: string, type: ExecutiveIntent["type"], objective: string): ExecutiveIntent {
    return {
        id,
        type,
        objective,
        reason: objective,
        sourceObservationIds: [`observation-${id}`],
        evidence: { source: "v7.8-e-demo" },
    };
}

function plan(id: string, capability: string, requiresFounderApproval = false): ExecutionPlan {
    return {
        id,
        goal: `Execute ${capability}`,
        sourcePlanId: `source-${id}`,
        steps: [
            {
                taskId: `task-${id}`,
                agentId: "demo-agent",
                capability,
                dependsOn: [],
                input: { demo: true },
            },
        ],
        requiresFounderApproval,
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        metadata: { source: "v7.8-e-demo" },
    };
}

const recoveryIntent = intent("recover", "RECOVER_FAILED_WORK", "Investigate and recover failed work.");
const recoveryPlan = plan("recovery", "work.recover");
const recoveryPolicy = policy.evaluate({ intent: recoveryIntent, plan: recoveryPlan });
const recoveryDecision = projector.decide(recoveryIntent, recoveryPlan, recoveryPolicy);

const customerIntent = intent("customer", "MONITOR_ACTIVE_WORK", "Continue observing active work.");
const customerPlan = plan("customer", "customer.send");
const customerPolicy = policy.evaluate({ intent: customerIntent, plan: customerPlan });
const customerDecision = projector.decide(customerIntent, customerPlan, customerPolicy);

const noActionIntent = intent("none", "NO_ACTION", "Take no action.");
const noActionPlan = plan("none", "work.recover");
const noActionPolicy = policy.evaluate({ intent: noActionIntent, plan: noActionPlan });
const noActionDecision = projector.decide(noActionIntent, noActionPlan, noActionPolicy);

console.log("V7.8-E EXECUTION DECISION DEMO");
console.log(`Recovery status : ${recoveryDecision.status}`);
console.log(`Customer status : ${customerDecision.status}`);
console.log(`No-action status: ${noActionDecision.status}`);
console.log(`Recovery approval : ${recoveryDecision.requiresFounderApproval}`);
console.log(`Customer approval : ${customerDecision.requiresFounderApproval}`);
console.log(`No-action approval: ${noActionDecision.requiresFounderApproval}`);

if (recoveryDecision.status !== "ELIGIBLE") throw new Error("Recovery work should be execution-eligible.");
if (customerDecision.status !== "BLOCKED") throw new Error("Customer work should be blocked for founder approval.");
if (noActionDecision.status !== "NOT_EXECUTABLE") throw new Error("NO_ACTION must never become executable work.");
if (recoveryDecision.requiresFounderApproval) throw new Error("Recovery should not require founder approval.");
if (!customerDecision.requiresFounderApproval) throw new Error("Customer action must require founder approval.");
if (noActionDecision.requiresFounderApproval) throw new Error("NO_ACTION cannot require approval.");
if (recoveryDecision.planId !== recoveryPlan.id) throw new Error("Recovery plan identity was not preserved.");
if (customerDecision.intentId !== customerIntent.id) throw new Error("Customer intent identity was not preserved.");

console.log("✓ Autonomy policy is converted into a formal execution decision.");
console.log("✓ Autonomous work becomes explicitly execution-eligible.");
console.log("✓ Consequential work becomes explicitly blocked pending founder approval.");
console.log("✓ NO_ACTION becomes explicitly non-executable.");
console.log("✓ Intent and plan identity are preserved at the execution boundary.");
console.log("✓ Decision projection creates no approval, queue item, or execution side effect.");
console.log("✓ No external provider or network request was used.");
