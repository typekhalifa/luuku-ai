import {
    registerAgent,
} from "../../agents/registry";

import {
    communicationPolicy,
} from "../communication-policy";

import {
    AgentPresence,
} from "../agent-presence";

import {
    CommunicationRequest,
} from "../types";

function presence(
    value: AgentPresence,
): AgentPresence {
    return value;
}

function register(
    id: string,
    name: string,
    role: string,
    agentPresence: AgentPresence,
): void {
    registerAgent(
        {
            id,
            name,
            role,
            async execute() {
                return {
                    success: true,
                    summary: "demo",
                    completedAt: new Date().toISOString(),
                };
            },
        },
        agentPresence,
    );
}

async function evaluate(
    request: CommunicationRequest,
): Promise<string> {
    const result =
        await communicationPolicy.evaluate(request);

    return result.decision.toUpperCase();
}

async function main(): Promise<void> {
    register(
        "research",
        "Research Agent",
        "Research",
        presence({
            id: "research",
            name: "Research Agent",
            department: "research",
            role: "research analyst",
            autonomy: "interactive",
            defaultVisibility: "department",
            scope: {
                canReceiveFounderCommands: true,
                canInitiateToFounder: true,
                canCommunicateWithLex: true,
                canCommunicateWithAgents: true,
                canCommunicateExternally: false,
                allowedTargetDepartments: ["sales", "research"],
            },
        }),
    );

    register(
        "sales",
        "Sales Agent",
        "Sales",
        presence({
            id: "sales",
            name: "Sales Agent",
            department: "sales",
            role: "sales operator",
            autonomy: "interactive",
            defaultVisibility: "department",
            scope: {
                canReceiveFounderCommands: true,
                canInitiateToFounder: true,
                canCommunicateWithLex: true,
                canCommunicateWithAgents: true,
                canCommunicateExternally: true,
            },
        }),
    );

    register(
        "finance",
        "Finance Agent",
        "Finance",
        presence({
            id: "finance",
            name: "Finance Agent",
            department: "finance",
            role: "financial controller",
            autonomy: "restricted",
            defaultVisibility: "founder",
            scope: {
                canReceiveFounderCommands: true,
                canInitiateToFounder: true,
                canCommunicateWithLex: true,
                canCommunicateWithAgents: false,
                canCommunicateExternally: false,
            },
        }),
    );

    register(
        "infra",
        "Infrastructure Agent",
        "Infrastructure",
        presence({
            id: "infra",
            name: "Infrastructure Agent",
            department: "infrastructure",
            role: "background systems worker",
            autonomy: "background",
            defaultVisibility: "system",
            scope: {
                canReceiveFounderCommands: false,
                canInitiateToFounder: false,
                canCommunicateWithLex: true,
                canCommunicateWithAgents: false,
                canCommunicateExternally: false,
            },
        }),
    );

    const cases = [
        {
            label: "Research → Founder",
            request: {
                capability: "discord.send",
                channel: "discord",
                requesterAgentId: "research",
                target: "founder",
                metadata: { audience: "internal" },
            } as CommunicationRequest,
            expected: "ALLOW",
        },
        {
            label: "Research → Sales",
            request: {
                capability: "discord.send",
                channel: "discord",
                requesterAgentId: "research",
                target: "agent",
                targetAgentId: "sales",
                metadata: { audience: "internal" },
            } as CommunicationRequest,
            expected: "ALLOW",
        },
        {
            label: "Research → Finance",
            request: {
                capability: "discord.send",
                channel: "discord",
                requesterAgentId: "research",
                target: "agent",
                targetAgentId: "finance",
                metadata: { audience: "internal" },
            } as CommunicationRequest,
            expected: "BLOCK",
        },
        {
            label: "Finance → Sales",
            request: {
                capability: "discord.send",
                channel: "discord",
                requesterAgentId: "finance",
                target: "agent",
                targetAgentId: "sales",
                metadata: { audience: "internal" },
            } as CommunicationRequest,
            expected: "BLOCK",
        },
        {
            label: "Infrastructure → Founder",
            request: {
                capability: "discord.send",
                channel: "discord",
                requesterAgentId: "infra",
                target: "founder",
                metadata: { audience: "internal" },
            } as CommunicationRequest,
            expected: "BLOCK",
        },
        {
            label: "Infrastructure → Lex",
            request: {
                capability: "discord.send",
                channel: "discord",
                requesterAgentId: "infra",
                target: "lex",
                metadata: { audience: "internal" },
            } as CommunicationRequest,
            expected: "ALLOW",
        },
    ];

    console.log("");
    console.log("========================================");
    console.log("  AGENT COMMUNICATION POLICY TEST");
    console.log("========================================");
    console.log("");

    for (const testCase of cases) {
        const actual = await evaluate(testCase.request);

        console.log(
            `${testCase.label.padEnd(30)} : ${actual}`,
        );

        if (actual !== testCase.expected) {
            throw new Error(
                `${testCase.label}: expected ${testCase.expected}, received ${actual}`,
            );
        }
    }

    console.log("");
    console.log(
        "GREEN: registered agent presence is enforced by communication policy.",
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
