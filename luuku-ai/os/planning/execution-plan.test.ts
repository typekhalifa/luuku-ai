import assert from "node:assert/strict";
import { createExecutionPlan } from "./execution-plan";
import { Priority } from "../../orchestration/task/priority";
import { TaskStatus } from "../../orchestration/task/task-status";
import { TaskType } from "../../orchestration/task/task-type";
import type { Plan } from "../../orchestration/planner/plan";

const now = new Date();

const plan: Plan = {
    id: "plan-v74b-demo",
    goal: "Research a prospect and prepare an offer",
    metadata: { source: "test" },
    createdAt: now,
    tasks: [
        {
            id: "research-1",
            title: "Research prospect",
            description: "Research the company and identify automation opportunities.",
            type: TaskType.RESEARCH,
            priority: Priority.HIGH,
            status: TaskStatus.PLANNED,
            input: { company: "Example Ltd" },
            metadata: {
                agentId: "research",
                capability: "company_research",
                requiresApproval: false,
            },
            createdAt: now,
            updatedAt: now,
        },
        {
            id: "proposal-1",
            title: "Prepare proposal",
            description: "Create an offer using the completed research.",
            type: TaskType.PROPOSAL,
            priority: Priority.HIGH,
            status: TaskStatus.PLANNED,
            input: { format: "brief" },
            metadata: {
                agentId: "sales",
                capability: "proposal_generation",
                dependsOn: ["research-1"],
                requiresApproval: true,
            },
            createdAt: now,
            updatedAt: now,
        },
    ],
};

const execution = createExecutionPlan(plan);

assert.equal(execution.id, "execution-plan-v74b-demo");
assert.equal(execution.sourcePlanId, plan.id);
assert.equal(execution.steps.length, 2);
assert.equal(execution.steps[0].agentId, "research");
assert.equal(execution.steps[0].capability, "company_research");
assert.deepEqual(execution.steps[1].dependsOn, ["research-1"]);
assert.equal(execution.requiresFounderApproval, true);

assert.throws(
    () => createExecutionPlan({
        ...plan,
        tasks: [{ ...plan.tasks[0], metadata: { capability: "company_research" } }],
    }),
    /missing metadata\.agentId/
);

assert.throws(
    () => createExecutionPlan({
        ...plan,
        tasks: [{ ...plan.tasks[0], metadata: { agentId: "research", capability: "company_research", dependsOn: ["missing"] } }],
    }),
    /depends on unknown task missing/
);

console.log("========================================");
console.log(" V7.4-B PLANNER → EXECUTION PLAN TEST");
console.log("========================================");
console.log("✓ Plan converted into executable steps");
console.log("✓ Agent + capability preserved");
console.log("✓ Dependencies preserved and validated");
console.log("✓ Founder approval propagated");
console.log("✓ Invalid plans fail safely");
