import {
    Agent,
    AgentResult,
    AgentTask,
} from "../../agents/interface";
import {
    getAgentPresence,
    getRegisteredAgent,
    registerAgent,
} from "../../agents/registry";
import {
    AgentPresence,
} from "../agent-presence";

const researchAgent: Agent = {
    id: "research-presence-demo",
    name: "Research Presence Demo",
    role: "research",

    async execute(
        _task: AgentTask,
    ): Promise<AgentResult> {
        return {
            success: true,
            summary: "Demo task completed.",
            completedAt: new Date().toISOString(),
        };
    },
};

const presence: AgentPresence = {
    id: researchAgent.id,
    name: researchAgent.name,
    department: "research",
    role: researchAgent.role,
    autonomy: "interactive",
    defaultVisibility: "department",
    scope: {
        canReceiveFounderCommands: true,
        canInitiateToFounder: true,
        canCommunicateWithLex: true,
        canCommunicateWithAgents: true,
        canCommunicateExternally: false,
    },
    discordChannel: "research",
};

console.log("");
console.log("========================================");
console.log("   AGENT REGISTRY PRESENCE TEST");
console.log("========================================");
console.log("");

registerAgent(researchAgent, presence);

const registered = getRegisteredAgent(researchAgent.id);
const resolvedPresence = getAgentPresence(researchAgent.id);

const agentMatches = registered?.agent.id === researchAgent.id;
const presenceMatches =
    resolvedPresence?.id === researchAgent.id &&
    resolvedPresence.department === "research";
const discordBindingMatches =
    resolvedPresence?.discordChannel === "research";

console.log(`Agent registered             : ${agentMatches ? "YES" : "NO"}`);
console.log(`Presence resolved            : ${presenceMatches ? "YES" : "NO"}`);
console.log(`Discord binding preserved    : ${discordBindingMatches ? "YES" : "NO"}`);

if (!agentMatches || !presenceMatches || !discordBindingMatches) {
    throw new Error("Agent registry presence integration failed.");
}

console.log("");
console.log("GREEN: registered agents can resolve their communication presence.");
