import {
    AgentPresence,
    canCommunicate,
} from "../agent-presence";

const research: AgentPresence = {
    id: "research-agent",
    name: "Research Agent",
    department: "research",
    role: "Business Research",
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

const finance: AgentPresence = {
    id: "finance-agent",
    name: "Finance Agent",
    department: "finance",
    role: "Financial Operations",
    autonomy: "restricted",
    defaultVisibility: "founder",
    scope: {
        canReceiveFounderCommands: true,
        canInitiateToFounder: true,
        canCommunicateWithLex: true,
        canCommunicateWithAgents: false,
        canCommunicateExternally: false,
    },
    discordChannel: "finance",
};

const infrastructure: AgentPresence = {
    id: "database-monitor",
    name: "Database Monitor",
    department: "infrastructure",
    role: "Database Health",
    autonomy: "background",
    defaultVisibility: "system",
    scope: {
        canReceiveFounderCommands: false,
        canInitiateToFounder: false,
        canCommunicateWithLex: true,
        canCommunicateWithAgents: false,
        canCommunicateExternally: false,
    },
};

const checks = [
    ["Research → founder", canCommunicate(research, "founder")],
    ["Research → agent", canCommunicate(research, "agent")],
    ["Research → external", canCommunicate(research, "external")],
    ["Finance → founder", canCommunicate(finance, "founder")],
    ["Finance → agent", canCommunicate(finance, "agent")],
    ["Infrastructure → founder", canCommunicate(infrastructure, "founder")],
    ["Infrastructure → Lex", canCommunicate(infrastructure, "lex")],
] as const;

console.log("");
console.log("========================================");
console.log("      AGENT PRESENCE MODEL TEST");
console.log("========================================");
console.log("");

for (const [label, allowed] of checks) {
    console.log(`${label.padEnd(31)} : ${allowed ? "ALLOW" : "BLOCK"}`);
}

const expectations = new Map(checks);
const expected: Record<string, boolean> = {
    "Research → founder": true,
    "Research → agent": true,
    "Research → external": false,
    "Finance → founder": true,
    "Finance → agent": false,
    "Infrastructure → founder": false,
    "Infrastructure → Lex": true,
};

for (const [label, actual] of expectations) {
    if (actual !== expected[label]) {
        throw new Error(`Presence model regression failed: ${label}`);
    }
}

console.log("");
console.log("GREEN: agent autonomy and communication scope behave as expected.");
