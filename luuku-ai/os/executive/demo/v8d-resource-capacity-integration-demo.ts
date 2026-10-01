import assert from "node:assert/strict";
import type { AgentResult } from "../../../shared/agents/interface.js";
import { AgentRegistry } from "../../agents/registry.js";
import { AgentDiscovery } from "../../agents/discovery.js";
import { CapabilityResolver } from "../../planning/capability-resolver.js";
import { InMemoryExecutiveObjectiveStore, type ExecutiveObjectiveRecord } from "../objective-engine.js";
import { ExecutiveCapacityGate } from "../executive-capacity-gate.js";
import { AutonomousExecutiveCycle } from "../autonomous-executive-cycle.js";
import { InMemoryWorkflowStore } from "../../../orchestration/workflow/workflow-store.js";
import { InMemoryQueueStore } from "../../../orchestration/queue/queue.js";

let executions = 0;
const now = new Date("2026-09-09T06:30:00.000Z");

const controlledAgent = {
    id: "v8d-capacity-agent",
    name: "V8-D Capacity Agent",
    role: "executes capacity-bounded work",
    async execute(): Promise<AgentResult> {
        executions += 1;
        return {
            success: true,
            summary: "Capacity-admitted work completed.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: { provider: "v8d-capacity-agent", externalId: `execution-${executions}` },
        };
    },
};

function objective(
    id: string,
    title: string,
    priority: ExecutiveObjectiveRecord["priority"],
    progress: number,
    previousProgress: number,
    minutesAgo: number,
): ExecutiveObjectiveRecord {
    return {
        id,
        title,
        description: `${title} objective`,
        priority,
        status: "ACTIVE",
        progress,
        previousProgress,
        createdAt: new Date(now.getTime() - minutesAgo * 60_000),
        updatedAt: now,
    };
}

async function main(): Promise<void> {
    const registry = new AgentRegistry();
    registry.register({ agent: controlledAgent, capabilities: ["work.recover"] });
    const resolver = new CapabilityResolver(new AgentDiscovery(registry));

    const objectives = new InMemoryExecutiveObjectiveStore();
    await objectives.save(objective("objective-revenue", "Protect Qualified Revenue", "high", 20, 20, 40));
    await objectives.save(objective("objective-efficiency", "Improve Agent Efficiency", "medium", 60, 60, 10));
    await objectives.save(objective("objective-reliability", "Recover Platform Reliability", "high", 35, 20, 30));

    const capacityGate = new ExecutiveCapacityGate([
        { id: "agent:v8d-capacity-agent", limit: 1 },
        { id: "tool:web", limit: 2 },
        { id: "concurrency:executive", limit: 1 },
    ]);

    const workflowStore = new InMemoryWorkflowStore();
    const queueStore = new InMemoryQueueStore();
    const cycle = new AutonomousExecutiveCycle(workflowStore, queueStore, resolver, {
        capabilities: {
            RECOVER_FAILED_WORK: "work.recover",
            INTERVENE_OBJECTIVE: "work.recover",
        },
        policyRules: [{
            capability: "work.recover",
            decision: "AUTONOMOUS",
            reason: "Controlled work is explicitly safe for this demonstration.",
        }],
        executeRuntime: true,
        maxObjectiveSelections: 2,
        objectiveStore: objectives,
        capacityGate,
        resourceRequirements: () => [
            { resourceId: "agent:v8d-capacity-agent" },
            { resourceId: "tool:web" },
            { resourceId: "concurrency:executive" },
        ],
        workflowExecutor: {
            async execute() {
                return controlledAgent.execute();
            },
        },
        memoryStore: {
            async list() { return []; },
            async save() { return undefined; },
        },
    });

    const result = await cycle.run({
        capabilities: {
            RECOVER_FAILED_WORK: "work.recover",
            INTERVENE_OBJECTIVE: "work.recover",
        },
        policyRules: [{
            capability: "work.recover",
            decision: "AUTONOMOUS",
            reason: "Controlled work is explicitly safe for this demonstration.",
        }],
        executeRuntime: true,
        maxObjectiveSelections: 2,
        objectiveStore: objectives,
    }, now);

    const objectiveResults = result.objectiveResults;
    const capacity = objectiveResults[0]?.capacity;
    const workflows = await workflowStore.list();
    const executed = result.runtime?.executed.length ?? 0;
    const completed = result.runtime?.completed.length ?? 0;
    const selectedIds = capacity?.evidence.selectedObjectiveIds as string[] | undefined;
    const rejectedIds = capacity?.evidence.rejectedObjectiveIds as string[] | undefined;

    assert.equal(objectiveResults.length, 1);
    assert.deepEqual(selectedIds, ["objective-revenue"]);
    assert.deepEqual(rejectedIds, ["objective-efficiency"]);
    assert.equal(executed, 1);
    assert.equal(completed, 1);
    assert.equal(workflows.length, 1);
    assert.equal(executions, 1);
    assert.equal(capacity?.capacity["agent:v8d-capacity-agent"].remaining, 0);
    assert.equal(capacity?.capacity["concurrency:executive"].remaining, 0);
    assert.equal(workflows.some((workflow) => rejectedIds?.some((id) => workflow.id.includes(id))), false);

    console.log("V8-D RESOURCE & CAPACITY INTEGRATION DEMO");
    console.log("V8-C selected       : objective-revenue -> objective-efficiency");
    console.log(`V8-D admitted       : ${selectedIds?.join(" -> ")}`);
    console.log(`V8-D rejected       : ${rejectedIds?.join(", ")}`);
    console.log(`Workflows submitted : ${workflows.length}`);
    console.log(`Workflows executed  : ${executed}`);
    console.log(`Workflows completed : ${completed}`);
    console.log(`Agent executions    : ${executions}`);
    console.log("");
    console.log("✓ V8-C arbitration feeds the V8-D capacity boundary");
    console.log("✓ capacity is enforced before planning and submission");
    console.log("✓ agent capacity bounds admitted work");
    console.log("✓ concurrency capacity bounds admitted work");
    console.log("✓ rejected capacity work never enters the V6 workflow path");
    console.log("✓ admitted work executes exactly once through V6");
    console.log("✓ V6 remains the execution authority");
    console.log("");
    console.log("V8-D resource & capacity integration: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
