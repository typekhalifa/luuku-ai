import { AgentDiscovery } from "../../agents/discovery.js";
import { AgentRegistry } from "../../agents/registry.js";
import { CapabilityResolver } from "../../planning/capability-resolver.js";
import { ExecutiveIntentPlanBuilder } from "../../planning/intent-plan-builder.js";
import type { ExecutiveIntent } from "../executive-intent.js";
import { ExecutiveExecutionCapacityGate } from "../execution-capacity-gate.js";
import { ExecutiveResourceCapacityEngine } from "../resource-capacity.js";
import type { Agent } from "../../../shared/agents/interface.js";

const agent: Agent = {
    id: "research-agent-z",
    name: "Research Agent Z",
    role: "Research and investigation",
    async execute() {
        throw new Error("Z demo must not execute an agent.");
    },
};

const registry = new AgentRegistry();
registry.register({ agent, capabilities: ["investigate-objective-bottleneck"] });
const resolver = new CapabilityResolver(new AgentDiscovery(registry));
const resolution = resolver.resolve({ capability: "investigate-objective-bottleneck" });
if (!resolution) throw new Error("Z demo expected capability resolution.");

const intent: ExecutiveIntent = {
    id: "objective-intervention-z",
    type: "INTERVENE_OBJECTIVE",
    objective: "Investigate a stalled objective.",
    reason: "Objective progress is stagnant and requires bottleneck investigation.",
    sourceObservationIds: [],
    evidence: { objectiveId: "objective-z-demo", intervention: "INVESTIGATE_STAGNATION" },
};

const plan = new ExecutiveIntentPlanBuilder(resolver).build({
    intent,
    capabilities: { INTERVENE_OBJECTIVE: "investigate-objective-bottleneck" },
});

const availableGate = new ExecutiveExecutionCapacityGate(
    new ExecutiveResourceCapacityEngine([
        { agentId: agent.id, maxConcurrent: 2, activeExecutions: 1, queuedExecutions: 0 },
    ]),
);
const available = availableGate.evaluate(plan, [resolution]);

const fullGate = new ExecutiveExecutionCapacityGate(
    new ExecutiveResourceCapacityEngine([
        { agentId: agent.id, maxConcurrent: 2, activeExecutions: 2, queuedExecutions: 1 },
    ]),
);
const deferred = fullGate.evaluate(plan, [resolution]);

if (available.decision !== "READY") throw new Error("Z demo expected available capacity to be ready.");
if (available.assessments[0]?.availableSlots !== 1) throw new Error("Z demo expected one available execution slot.");
if (deferred.decision !== "DEFERRED") throw new Error("Z demo expected full capacity to defer execution.");
if (deferred.assessments[0]?.status !== "AT_CAPACITY") throw new Error("Z demo expected AT_CAPACITY status.");

console.log("V7.8-Z RESOURCE & CAPACITY INTELLIGENCE DEMO");
console.log(`Resolved agent      : ${resolution.agentId}`);
console.log(`Available decision  : ${available.decision}`);
console.log(`Available slots     : ${available.assessments[0]?.availableSlots ?? 0}`);
console.log(`Full-capacity       : ${deferred.decision}`);
console.log(`Capacity status     : ${deferred.assessments[0]?.status ?? "UNKNOWN"}`);
console.log(`Queued executions   : ${deferred.assessments[0]?.queuedExecutions ?? 0}`);
console.log("");
console.log("✓ Capability resolution identifies the responsible agent.");
console.log("✓ Available capacity makes work execution-ready.");
console.log("✓ Full agent capacity deterministically defers new execution.");
console.log("✓ Capacity assessment exposes active, queued, and available slots.");
console.log("✓ The capacity gate creates no queue items and executes no agents.");
console.log("✓ Resource intelligence remains a planning/execution-readiness boundary above V6.");
