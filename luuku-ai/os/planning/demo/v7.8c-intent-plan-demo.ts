import { ExecutiveObservationLoop } from "../../executive/executive-observation.js";
import { ExecutiveIntentProjector } from "../../executive/executive-intent.js";
import { ExecutiveIntentPlanBuilder } from "../intent-plan-builder.js";
import { CapabilityResolver } from "../capability-resolver.js";
import { AgentRegistry } from "../../agents/registry.js";
import type { Agent } from "../../../shared/agents/interface.js";
import type { AgentResult } from "../../../shared/agents/interface.js";

const recoveryAgent: Agent = {
    id: "recovery-agent",
    name: "Recovery Agent",
    role: "Recovery investigation",
    async execute(_task): Promise<AgentResult> {
        throw new Error("Demo agent must never execute.");
    },
};

const registry = new AgentRegistry();
registry.register({
    agent: recoveryAgent,
    capabilities: ["work.recover"],
});

const resolver = new CapabilityResolver(
    new (class extends (awaitableAgentDiscoveryBase()) {})(),
);

function awaitableAgentDiscoveryBase() {
    return class {};
}
