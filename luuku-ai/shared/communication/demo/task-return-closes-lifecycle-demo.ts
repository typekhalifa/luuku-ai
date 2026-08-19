import { Agent, AgentResult, AgentTask } from "../../agents/interface";
import { registerAgent } from "../../agents/registry";
import { AgentDelegationRequest } from "../agent-delegation.service";
import { AgentReturnService } from "../agent-return.service";
import { AgentTaskLifecycleService } from "../agent-task-lifecycle.service";
import { AgentTaskReturnService } from "../agent-task-return.service";
import { InMemoryCommunicationService } from "../in-memory-communication-service";

async function main(): Promise<void> {
    const founderId = `return-founder-${Date.now()}`;
    const researchId = `return-research-${Date.now()}`;
    const taskId = `return-close-task-${Date.now()}`;
    const conversationId = `agent:${founderId}:${researchId}`;

    const founder: Agent = {
        id: founderId,
        name: "Return Lifecycle Founder",
        role: "executive",
        async execute(): Promise<AgentResult> {
            return {
                success: true,
                summary: "Founder received the result.",
                completedAt: new Date().toISOString(),
            };
        },
    };

    const research: Agent = {
        id: researchId,
        name: "Return Lifecycle Research Agent",
        role: "research",
        async execute(): Promise<AgentResult> {
            return {
                success: true,
                summary: "Research completed and verified.",
                completedAt: new Date().toISOString(),
                executionStatus: "verified",
                executed: true,
                verified: true,
                evidence: {
                    provider: "task-return-demo",
                    externalId: "research-result-verified-001",
                },
            };
        },
    };

    registerAgent(founder);
    registerAgent(research);

    const communicationService = new InMemoryCommunicationService();
    const lifecycleService = new AgentTaskLifecycleService();
    const returnService = new AgentReturnService(communicationService);
    const taskReturnService = new AgentTaskReturnService(
        returnService,
        lifecycleService,
    );

    const task: AgentTask = {
        id: taskId,
        title: "Close returned research task",
        description: "Verify that the returned result closes the originating task.",
        priority: "high",
    };

    const delegation: AgentDelegationRequest = {
        fromAgentId: founderId,
        toAgentId: researchId,
        task,
    };

    lifecycleService.plan(delegation);

    const result = await research.execute(task);

    const returned = await taskReturnService.returnAndClose({
        delegation,
        conversationId,
        result,
    });

    const conversation = await communicationService.getConversation(
        conversationId,
    );

    if (
        returned.returnResult.status !== "completed" ||
        returned.taskRecord.status !== "completed" ||
        returned.taskRecord.agentResult?.verified !== true ||
        returned.taskRecord.communicationMessageId !==
            returned.returnResult.communicationMessageId ||
        conversation?.messages.length !== 1
    ) {
        throw new Error("Returned result did not close the originating task lifecycle.");
    }

    console.log("");
    console.log("========================================");
    console.log("   TASK RETURN LIFECYCLE CLOSURE TEST");
    console.log("========================================");
    console.log("");
    console.log(`Task status         : ${returned.taskRecord.status}`);
    console.log(`Return status       : ${returned.returnResult.status}`);
    console.log(`Task ID             : ${taskId}`);
    console.log(`Conversation        : ${conversationId}`);
    console.log(`Result message      : ${returned.returnResult.communicationMessageId}`);
    console.log(`Execution status    : ${result.executionStatus}`);
    console.log(`Verified            : ${result.verified}`);
    console.log(`Conversation msgs  : ${conversation?.messages.length ?? 0}`);
    console.log("");
    console.log(
        "GREEN: returned agent results automatically close the originating task lifecycle.",
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
