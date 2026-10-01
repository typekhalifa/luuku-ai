import { registerAgent } from "../../agents/registry";
import { Agent } from "../../agents/interface";
import { AgentPresence } from "../agent-presence";
import { AgentTaskLifecycleService } from "../agent-task-lifecycle.service";

const research: Agent = {
    id: "research",
    name: "Research Agent",
    role: "research",
    async execute(task) {
        return {
            success: true,
            summary: `Completed: ${task.title}`,
            completedAt: new Date().toISOString(),
            executionStatus: "verified",
            executed: true,
            verified: true,
        };
    },
};

const sales: Agent = {
    id: "sales",
    name: "Sales Agent",
    role: "sales",
    async execute(task) {
        return {
            success: true,
            summary: `Sales received: ${task.title}`,
            completedAt: new Date().toISOString(),
            executionStatus: "verified",
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
    autonomy: "interactive",
    defaultVisibility: "department",
    scope: {
        canReceiveFounderCommands: true,
        canInitiateToFounder: true,
        canCommunicateWithLex: true,
        canCommunicateWithAgents: true,
        canCommunicateExternally: true,
        allowedTargetDepartments: ["research"],
    },
};

registerAgent(research, researchPresence);
registerAgent(sales, salesPresence);

async function main() {
    const lifecycle = new AgentTaskLifecycleService();

    const record = await lifecycle.execute({
        fromAgentId: "research",
        toAgentId: "sales",
        task: {
            id: "task-lifecycle-demo-001",
            title: "Prepare qualified prospect handoff",
            description: "Pass the qualified prospect research to Sales.",
            priority: "high",
        },
    });

    const stored = lifecycle.get("task-lifecycle-demo-001");

    console.log("");
    console.log("========================================");
    console.log("       AGENT TASK LIFECYCLE TEST");
    console.log("========================================");
    console.log("");
    console.log(`Final status          : ${record.status}`);
    console.log(`Communication message : ${record.communicationMessageId ? "created" : "missing"}`);
    console.log(`Conversation           : ${record.conversationId ?? "missing"}`);
    console.log(`Target executed        : ${record.agentResult?.executed ?? false}`);
    console.log(`Target verified        : ${record.agentResult?.verified ?? false}`);
    console.log(`Stored record          : ${stored === record ? "YES" : "NO"}`);

    if (
        record.status !== "completed" ||
        !record.communicationMessageId ||
        !record.conversationId ||
        record.agentResult?.executed !== true ||
        record.agentResult?.verified !== true ||
        stored !== record
    ) {
        throw new Error("Agent task lifecycle test failed.");
    }

    console.log("");
    console.log("GREEN: task lifecycle tracks delegation from planned through verified completion.");
}

void main();
