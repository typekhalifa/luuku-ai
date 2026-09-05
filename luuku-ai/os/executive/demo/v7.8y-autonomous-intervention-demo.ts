import { AgentRegistry } from "../../agents/registry.js";
import { AgentDiscovery } from "../../agents/discovery.js";
import { CapabilityResolver } from "../../planning/capability-resolver.js";
import { ExecutiveObjectiveInterventionEngine } from "../objective-intervention.js";
import { InMemoryExecutiveObjectiveStore, type ExecutiveObjectiveRecord } from "../objective-engine.js";
import { ObjectiveDrivenExecutiveCycle } from "../objective-driven-executive-cycle.js";
import type { ExecutiveState } from "../executive-state.js";
import type { Agent } from "../../../shared/agents/interface.js";

const now = new Date("2026-09-05T08:00:00.000Z");

const baseObjective = (overrides: Partial<ExecutiveObjectiveRecord>): ExecutiveObjectiveRecord => ({
    id: "objective-y-demo",
    title: "Improve Qualified Prospect Conversion",
    description: "Increase the conversion of qualified prospects into customers.",
    priority: "high",
    status: "ACTIVE",
    progress: 40,
    createdAt: now,
    updatedAt: now,
    ...overrides,
});

const state: ExecutiveState = {
    generatedAt: now,
    active: 0,
    waitingApproval: 0,
    failed: 0,
    completed: 0,
    attention: [],
};

const interventionEngine = new ExecutiveObjectiveInterventionEngine();

const stagnant = interventionEngine.assess({
    objective: baseObjective({ progress: 40, previousProgress: 40 }),
    assessment: {
        objectiveId: "objective-y-demo",
        status: "ACTIVE",
        progress: 40,
        attentionRequired: true,
        reason: "Objective is active and requires the executive to determine its next useful work.",
    },
    progressTrend: {
        objectiveId: "objective-y-demo",
        trend: "STAGNANT",
        delta: 0,
        interventionScore: 30,
        interventionRequired: true,
    },
});

const regressing = interventionEngine.assess({
    objective: baseObjective({ progress: 30, previousProgress: 40 }),
    assessment: {
        objectiveId: "objective-y-demo",
        status: "ACTIVE",
        progress: 30,
        attentionRequired: true,
        reason: "Objective is active and requires the executive to determine its next useful work.",
    },
    progressTrend: {
        objectiveId: "objective-y-demo",
        trend: "REGRESSING",
        delta: -10,
        interventionScore: 50,
        interventionRequired: true,
    },
});

const improving = interventionEngine.assess({
    objective: baseObjective({ progress: 50, previousProgress: 40 }),
    assessment: {
        objectiveId: "objective-y-demo",
        status: "ACTIVE",
        progress: 50,
        attentionRequired: true,
        reason: "Objective is active and requires the executive to determine its next useful work.",
    },
    progressTrend: {
        objectiveId: "objective-y-demo",
        trend: "IMPROVING",
        delta: 10,
        interventionScore: 0,
        interventionRequired: false,
    },
});

const failed = interventionEngine.assess({
    objective: baseObjective({ progress: 30, previousProgress: 40 }),
    assessment: {
        objectiveId: "objective-y-demo",
        status: "ACTIVE",
        progress: 30,
        attentionRequired: true,
        reason: "Objective remains active while failed work requires executive attention.",
    },
    progressTrend: {
        objectiveId: "objective-y-demo",
        trend: "REGRESSING",
        delta: -10,
        interventionScore: 50,
        interventionRequired: true,
    },
});

const agentExecutions = { count: 0 };
const interventionAgent: Agent = {
    id: "objective-investigation-agent-y",
    name: "Objective Investigation Agent",
    role: "Investigates objective bottlenecks",
    async execute() {
        agentExecutions.count += 1;
        return {
            success: true,
            summary: "Investigation completed.",
            completedAt: new Date().toISOString(),
        };
    },
};

const registry = new AgentRegistry();
registry.register({
    agent: interventionAgent,
    capabilities: ["investigate-objective-bottleneck"],
});
const resolver = new CapabilityResolver(new AgentDiscovery(registry));
const objectiveStore = new InMemoryExecutiveObjectiveStore();
await objectiveStore.save(baseObjective({ progress: 30, previousProgress: 40 }));

const cycle = new ObjectiveDrivenExecutiveCycle(objectiveStore, resolver);
const results = await cycle.run(
    state,
    { INTERVENE_OBJECTIVE: "investigate-objective-bottleneck" },
    now,
);

const result = results[0];
if (!result) throw new Error("Y demo expected one selected objective.");
if (result.intervention.type !== "RECOVER_REGRESSION") throw new Error("Y demo expected regression recovery intervention.");
if (result.intent.type !== "INTERVENE_OBJECTIVE") throw new Error("Y demo expected intervention intent.");
if (!result.plan) throw new Error("Y demo expected an intervention execution plan.");
if (agentExecutions.count !== 0) throw new Error("Y planning demo must not execute the agent.");

if (stagnant.type !== "INVESTIGATE_STAGNATION") throw new Error("Y demo expected stagnation investigation.");
if (regressing.type !== "RECOVER_REGRESSION") throw new Error("Y demo expected regression recovery.");
if (improving.type !== "NO_INTERVENTION") throw new Error("Y demo expected no intervention for improving progress.");
if (failed.type !== "RECOVER_FAILED_WORK") throw new Error("Y demo expected failed-work recovery.");

console.log("V7.8-Y AUTONOMOUS INTERVENTION DEMO");
console.log(`Stagnant intervention: ${stagnant.type}`);
console.log(`Regressing intervention: ${regressing.type}`);
console.log(`Improving intervention: ${improving.type}`);
console.log(`Failed-work intervention: ${failed.type}`);
console.log(`Cycle intervention   : ${result.intervention.type}`);
console.log(`Intent               : ${result.intent.type}`);
console.log(`Plan                 : ${result.plan.id}`);
console.log(`Agent executions     : ${agentExecutions.count}`);
console.log("");
console.log("✓ Stagnant objectives trigger explicit bottleneck investigation.");
console.log("✓ Regressing objectives trigger corrective intervention.");
console.log("✓ Failed work preserves the existing recovery path.");
console.log("✓ Improving objectives do not trigger unnecessary intervention.");
console.log("✓ Intervention flows into the existing intent → capability → plan pipeline.");
console.log("✓ The intervention layer remains side-effect free; V6 execution stays below planning.");
