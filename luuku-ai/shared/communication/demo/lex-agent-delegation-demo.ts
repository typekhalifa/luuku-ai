import { registerAgent } from "../../agents/registry";
import { Agent, AgentResult } from "../../agents/interface";
import { AgentDelegationService } from "../agent-delegation.service";
import { InMemoryCommunicationService } from "../in-memory-communication-service";
import { lexPresence } from "../../executive/lex-presence";

const target: Agent = {
    id: "research-demo",
    name: "Research Demo Agent",
    role: "Research",
    async execute(): Promise<AgentResult> {
        return {
            success: true,
            summary: "Research demo task completed.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
        };
    },
};

registerAgent(target, {
    ...lexPresence,
    id: "research-demo",
    name: "Research Demo Agent",
    department: "research",
    role: "Research",
    autonomy: "interactive",
    defaultVisibility: "department",
    scope: {
        ...lexPresence.scope,
        canReceiveFounderCommands: true,
        canCommunicateWithLex: true,
        canCommunicateWithAgents: true,
        canCommunicateExternally: false,
    },
});

async function run(): Promise<void> {
    const communication = new InMemoryCommunicationService();
    const service = new AgentDelegationService(communication);

    const result = await service.delegate({
        fromAgentId: "lex",
        fromPresence: lexPresence,
        toAgentId: "research-demo",
        task: {
            id: "lex-delegation-demo-task",
            title: "Research demo task",
            description: "Research the demo opportunity.",
            priority: "medium",
        },
    });

    const conversation = await communication.getConversation(
        "agent:lex:research-demo",
    );

    console.log("");
    console.log("========================================");
    console.log("       LEX AGENT DELEGATION TEST");
    console.log("========================================");
    console.log("");
    console.log(`Delegation status      : ${result.status}`);
    console.log(`Communication message : ${result.communicationMessageId ?? "none"}`);
    console.log(`Target executed       : ${result.agentResult?.executed === true}`);
    console.log(`Conversation messages : ${conversation?.messages.length ?? 0}`);

    if (
        result.status !== "completed" ||
        result.agentResult?.executed !== true ||
        !result.communicationMessageId ||
        conversation?.messages.length !== 1
    ) {
        throw new Error("Lex delegation regression failed.");
    }

    console.log("");
    console.log("GREEN: Lex can delegate through Communication Core without being a registered execution agent.");
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
