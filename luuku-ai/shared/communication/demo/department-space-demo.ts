import {
    AgentPresence,
} from "../agent-presence";

import {
    CommunicationSpace,
    bindingForChannel,
    canJoinCommunicationSpace,
} from "../department-space";

const research: AgentPresence = {
    id: "research",
    name: "Research Agent",
    department: "research",
    role: "Research",
    autonomy: "interactive",
    defaultVisibility: "department",
    scope: {
        canReceiveFounderCommands: true,
        canInitiateToFounder: true,
        canCommunicateWithLex: true,
        canCommunicateWithAgents: true,
        canCommunicateExternally: false,
        allowedTargetDepartments: ["sales"],
    },
};

const finance: AgentPresence = {
    id: "finance",
    name: "Finance Agent",
    department: "finance",
    role: "Finance",
    autonomy: "restricted",
    defaultVisibility: "founder",
    scope: {
        canReceiveFounderCommands: true,
        canInitiateToFounder: true,
        canCommunicateWithLex: true,
        canCommunicateWithAgents: false,
        canCommunicateExternally: false,
    },
};

const infrastructure: AgentPresence = {
    id: "health-monitor",
    name: "Health Monitor",
    department: "infrastructure",
    role: "System Health",
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

const spaces: CommunicationSpace[] = [
    {
        id: "research",
        name: "Research",
        department: "research",
        kind: "department",
        members: [],
        bindings: [
            {
                channel: "discord",
                externalId: "discord-research",
                name: "#research",
            },
        ],
    },
    {
        id: "finance",
        name: "Finance",
        department: "finance",
        kind: "restricted",
        members: ["finance"],
        bindings: [
            {
                channel: "discord",
                externalId: "discord-finance",
                name: "#finance",
            },
        ],
    },
    {
        id: "system",
        name: "System",
        department: "infrastructure",
        kind: "system",
        members: [],
        bindings: [
            {
                channel: "internal",
                name: "system",
            },
        ],
    },
];

console.log("");
console.log("========================================");
console.log("     DEPARTMENT SPACE MODEL TEST");
console.log("========================================");
console.log("");

const researchSpace = spaces[0];
const financeSpace = spaces[1];
const systemSpace = spaces[2];

const checks = [
    [
        "Research → #research",
        canJoinCommunicationSpace(research, researchSpace),
    ],
    [
        "Finance → #finance",
        canJoinCommunicationSpace(finance, financeSpace),
    ],
    [
        "Research → #finance",
        canJoinCommunicationSpace(research, financeSpace),
    ],
    [
        "Finance → #research",
        canJoinCommunicationSpace(finance, researchSpace),
    ],
    [
        "Health Monitor → system",
        canJoinCommunicationSpace(infrastructure, systemSpace),
    ],
];

for (const [label, allowed] of checks) {
    console.log(
        `${String(label).padEnd(30)} : ${allowed ? "ALLOW" : "BLOCK"}`,
    );
}

const researchDiscord = bindingForChannel(researchSpace, "discord");
const systemInternal = bindingForChannel(systemSpace, "internal");

console.log("");
console.log(`Research Discord binding     : ${researchDiscord?.name}`);
console.log(`System internal binding      : ${systemInternal?.name}`);

const expected = [
    checks[0][1] === true,
    checks[1][1] === true,
    checks[2][1] === false,
    checks[3][1] === false,
    checks[4][1] === true,
    researchDiscord?.externalId === "discord-research",
    systemInternal?.channel === "internal",
];

if (!expected.every(Boolean)) {
    throw new Error("Department communication space regression failed.");
}

console.log("");
console.log(
    "GREEN: department spaces enforce membership and expose channel bindings without making Discord the source of truth.",
);
