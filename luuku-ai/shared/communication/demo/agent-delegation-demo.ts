import { registerAgent } from "../../agents/registry";
import { Agent } from "../../agents/interface";
import { AgentDelegationService } from "../agent-delegation.service";
import { AgentPresence } from "../agent-presence";

const researchAgent: Agent = {
    id: "research",
    name: "Research Agent",
    role: "Research",
    async execute(task) {
        return {
            success: true,
            summary: `Research completed: ${task.title}`,
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
        };
    },
};

const salesAgent: Agent = {
    id: "sales",
    name: "Sales Agent",
    role: "Sales",
    async execute(task) {
        return {
            success: true,
            summary: `Sales task completed: ${task.title}`,
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
        };
    },
};

const researchPresence: AgentPresence = {
    id: "research",
    name: "Research Agent",
    department: "research",
    role: "research",
    autonomy: "autonomous",
    defaultVisibility: "cross-department",
    scope: {
        canReceiveFounderCommands: true,
        canInitiateToFounder: true,
        canCommunicateWithLex: true,
        canCommunicateWithAgents: true,
        canCommunicateExternally: false,
        allowedTargetDepartments: ["sales"],
    },
};

const salesPresence: AgentPresence = {
    id: "sales",
    name: "Sales Agent",
    department: "sales",
    role: "sales",
    autonomy: "autonomous",
    defaultVisibility: "department",
    scope: {
        canReceiveFounderCommands: true,
        canInitiateToFounder: true,
        canCommunicateWithLex: true,
        canCommunicateWithAgents: false,
        canCommunicateExternally: true,
    },
};

registerAgent(researchAgent, researchPresence);
registerAgent(salesAgent, salesPresence);

async function main() {
    console.log("");
    console.log("========================================");
    console.log("      INTERNAL AGENT DELEGATION TEST");
    console.log("========================================");
    console.log("");

    const service = new AgentDelegationService();

    const result = await service.delegate({
        fromAgentId: "research",
        toAgentId: "sales",
        task: {
            id: "task-delegation-demo",
            title: "Prepare prospect handoff",
            description: "Prepare the sales team with the research findings for this prospect.",
            priority: "high",
        },
    });

    console.log(`Delegation status      : ${result.status}`);
    console.log(`Conversation           : ${result.conversationId}`);
    console.log(`Communication message : ${result.communicationMessageId}`);
    console.log(`Target executed       : ${result.agentResult?.executed}`);
    console.log(`Target verified       : ${result.agentResult?.verified}`);
    console.log("");

    if (
        result.status === "completed" &&
        result.agentResult?.success === true &&
        result.communicationMessageId
    ) {
        console.log("GREEN: delegation travels through Communication Core before target execution.");
        return;
    }

    throw new Error(`Delegation demo failed: ${result.error ?? "unknown error"}`);
}

void main();
