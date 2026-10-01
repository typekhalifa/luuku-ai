import { registerAgent } from "../../agents/registry";
import { Agent } from "../../agents/interface";
import { AgentPresence } from "../agent-presence";
import { AgentTaskRecoveryService } from "../agent-task-recovery.service";
import { AgentDelegationRequest } from "../agent-delegation.service";

let attempts = 0;

const researchAgent: Agent = {
    id: "recovery-research",
    name: "Recovery Research Agent",
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
    id: "recovery-sales",
    name: "Recovery Sales Agent",
    role: "Sales",
    async execute(task) {
        attempts += 1;

        if (attempts === 1) {
            return {
                success: false,
                summary: "Temporary provider failure while preparing the sales handoff.",
                completedAt: new Date().toISOString(),
                executionStatus: "failed",
                executed: false,
                verified: false,
            };
        }

        return {
            success: true,
            summary: `Sales task completed after retry: ${task.title}`,
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
        };
    },
};

const researchPresence: AgentPresence = {
    id: researchAgent.id,
    name: researchAgent.name,
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
    id: salesAgent.id,
    name: salesAgent.name,
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

async function main(): Promise<void> {
    const request: AgentDelegationRequest = {
        fromAgentId: researchAgent.id,
        toAgentId: salesAgent.id,
        task: {
            id: `recovery-task-${Date.now()}`,
            title: "Recover prospect handoff",
            description: "Demonstrate bounded retry after a temporary failure.",
            priority: "high",
        },
    };

    const service = new AgentTaskRecoveryService();

    const first = await service.recover(request, 2);
    const second = await service.recover(request, 2);
    const blockedBudget = await service.recover(request, 2);

    console.log("");
    console.log("========================================");
    console.log("        AGENT TASK RECOVERY TEST");
    console.log("========================================");
    console.log("");
    console.log(`First decision       : ${first.decision}`);
    console.log(`First status         : ${first.record.status}`);
    console.log(`Retry budget         : ${first.attemptsRemaining}`);
    console.log(`Second decision      : ${second.decision}`);
    console.log(`Final status         : ${second.record.status}`);
    console.log(`Attempts             : ${second.record.attemptCount}`);
    console.log(`Verified             : ${second.record.agentResult?.verified}`);
    console.log(`Post-completion      : ${blockedBudget.decision}`);
    console.log("");

    if (
        first.decision !== "retry" ||
        first.record.status !== "failed" ||
        second.decision !== "completed" ||
        second.record.status !== "completed" ||
        second.record.attemptCount !== 2 ||
        second.record.agentResult?.verified !== true ||
        blockedBudget.decision !== "completed"
    ) {
        throw new Error("Agent task recovery did not enforce bounded retry semantics.");
    }

    console.log(
        "GREEN: temporary failures can retry within a bounded budget, while completed work is never re-executed.",
    );
}

void main();
