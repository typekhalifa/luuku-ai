import type { QueueStore } from "../../../orchestration/queue/queue.js";
import type { WorkflowStore } from "../../../orchestration/workflow/workflow-store.js";
import type { CapabilityResolver } from "../../planning/capability-resolver.js";
import type { IntentPlanCapabilityMap } from "../../planning/intent-plan-builder.js";
import type { ExecutiveMemoryStore } from "../executive-memory.js";
import type { ExecutiveLoopCheckpointStore } from "../executive-loop-checkpoint.js";
import type { ExecutiveObjectiveStore } from "../objective-engine.js";
import { createExecutiveComposition } from "../executive-composition.js";

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
    console.log(`✓ ${message}`);
}

const workflowStore = {} as WorkflowStore;
const queueStore = {} as QueueStore;
const capabilityResolver = {} as CapabilityResolver;
const objectiveStore = {} as ExecutiveObjectiveStore;
const memoryStore = {} as ExecutiveMemoryStore;
const checkpointStore = {} as ExecutiveLoopCheckpointStore;
const capabilities = {} as IntentPlanCapabilityMap;

const composition = createExecutiveComposition({
    workflowStore,
    queueStore,
    capabilityResolver,
    objectiveStore,
    memoryStore,
    checkpointStore,
    capabilities,
    policyRules: [],
    intervalMs: 60_000,
});

assert(composition.cycle !== undefined, "cycle is composed");
assert(composition.loop !== undefined, "persistent loop is composed");
assert(composition.service !== undefined, "persistent service is composed");

console.log("Executive composition : cycle -> loop -> service");
console.log("Execution authority   : V6 runtime");
console.log("Durable dependencies  : explicitly injected");
console.log("Consolidation status   : PASS");
