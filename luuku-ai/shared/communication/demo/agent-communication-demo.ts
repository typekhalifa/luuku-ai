import { registerAgent } from "../../agents/registry";
import { Agent } from "../../agents/interface";
import { AgentCommunicationService } from "../agent-communication";
import { InMemoryCommunicationService } from "../in-memory-communication-service";
import { AgentPresence } from "../agent-presence";

function makeAgent(
    id: string,
    name: string,
): Agent {
    return {
        id,
        name,
        role: name,
        async execute() {
            return {
                success: true,
                summary: `${name} completed the task.`,
                completedAt: new Date().toISOString(),
            };
        },
    };
}

const researchPresence: AgentPresence = {
    id: "research-agent",
    name: "Research Agent",
    department: "research",
    role: "research",
    autonomy: "autonomous",
    defaultVisibility: "cross-department",
    scope: {
        canReceiveFounderCommands: true,
        canInitiateToFounder: false,
        canCommunicateWithLex: true,
        canCommunicateWithAgents: true,
        canCommunicateExternally: false,
        allowedTargetDepartments: ["sales", "research"],
    },
};

const salesPresence: AgentPresence = {
    id: "sales-agent",
    name: "Sales Agent",
    department: "sales",
    role: "sales",
    autonomy: "interactive",
    defaultVisibility: "cross-department",
    scope: {
        canReceiveFounderCommands: true,
        canInitiateToFounder: false,
        canCommunicateWithLex: true,
        canCommunicateWithAgents: true,
        canCommunicateExternally: true,
        allowedTargetDepartments: ["research", "sales"],
    },
};

const financePresence: AgentPresence = {
    id: "finance-agent",
    name: "Finance Agent",
    department: "finance",
    role: "finance",
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

registerAgent(makeAgent("research-agent", "Research Agent"), researchPresence);
registerAgent(makeAgent("sales-agent", "Sales Agent"), salesPresence);
registerAgent(makeAgent("finance-agent", "Finance Agent"), financePresence);

const communication = new InMemoryCommunicationService();
const agentCommunication = new AgentCommunicationService(communication);

async function run(): Promise<void> {
    const researchToSales = await agentCommunication.send({
        senderAgentId: "research-agent",
        recipientAgentId: "sales-agent",
        content: "Research completed. Three prospects are ready for outreach.",
    });

    const researchToFinance = await agentCommunication.send({
        senderAgentId: "research-agent",
        recipientAgentId: "finance-agent",
        content: "Please review the commercial assumptions.",
    });

    const financeToSales = await agentCommunication.send({
        senderAgentId: "finance-agent",
        recipientAgentId: "sales-agent",
        content: "Please confirm the latest proposal amount.",
    });

    const conversation = researchToSales.message
        ? await communication.getConversation(researchToSales.message.conversationId)
        : null;

    console.log("");
    console.log("========================================");
    console.log("     INTERNAL AGENT COMMUNICATION TEST");
    console.log("========================================");
    console.log("");
    console.log(
        `Research → Sales       : ${researchToSales.accepted ? "ALLOW" : "BLOCK"}`,
    );
    console.log(
        `Research → Finance     : ${researchToFinance.accepted ? "ALLOW" : "BLOCK"}`,
    );
    console.log(
        `Finance → Sales        : ${financeToSales.accepted ? "ALLOW" : "BLOCK"}`,
    );
    console.log(
        `Conversation channel   : ${conversation?.channel ?? "none"}`,
    );
    console.log(
        `Conversation message   : ${conversation?.messages.length ?? 0}`,
    );
    console.log("");

    if (
        !researchToSales.accepted ||
        researchToFinance.accepted ||
        financeToSales.accepted ||
        conversation?.channel !== "internal" ||
        conversation.messages.length !== 1
    ) {
        throw new Error("Internal agent communication regression failed.");
    }

    console.log(
        "GREEN: agents communicate through Communication Core with department scope enforced.",
    );
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
