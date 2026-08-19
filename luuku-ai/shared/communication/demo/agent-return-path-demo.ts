import { AgentResult } from "../../agents/interface";
import { Agent } from "../../agents/interface";
import { registerAgent } from "../../agents/registry";
import { AgentReturnService } from "../agent-return.service";
import { InMemoryCommunicationService } from "../in-memory-communication-service";

async function main(): Promise<void> {
    const researchId = `return-research-${Date.now()}`;
    const lexId = `return-lex-${Date.now()}`;

    const researchAgent: Agent = {
        id: researchId,
        name: "Return Path Research Agent",
        role: "research",
        async execute() {
            return {
                success: true,
                summary: "Research completed successfully.",
                completedAt: new Date().toISOString(),
                executionStatus: "verified",
                executed: true,
                verified: true,
                evidence: {
                    provider: "return-path-demo",
                    externalId: "research-result-001",
                },
            };
        },
    };

    const lexAgent: Agent = {
        id: lexId,
        name: "LEX Return Receiver",
        role: "executive",
        async execute() {
            return {
                success: true,
                summary: "LEX received the delegated result.",
                completedAt: new Date().toISOString(),
            };
        },
    };

    registerAgent(researchAgent);
    registerAgent(lexAgent);

    const communicationService = new InMemoryCommunicationService();
    const returnService = new AgentReturnService(communicationService);
    const conversationId = `agent:${lexId}:${researchId}`;
    const taskId = `return-task-${Date.now()}`;

    const agentResult: AgentResult = await researchAgent.execute({
        id: taskId,
        title: "Return path test",
        description: "Return a completed research result to LEX.",
        priority: "high",
    });

    const returned = await returnService.returnResult({
        fromAgentId: researchId,
        toAgentId: lexId,
        taskId,
        conversationId,
        result: agentResult,
    });

    const conversation = await communicationService.getConversation(conversationId);

    if (
        returned.status !== "completed" ||
        !returned.communicationMessageId ||
        !conversation ||
        conversation.messages.length !== 1 ||
        conversation.messages[0]?.metadata?.type !== "agent-delegation-result" ||
        conversation.messages[0]?.metadata?.taskId !== taskId ||
        conversation.messages[0]?.metadata?.verified !== true
    ) {
        throw new Error("Agent return path did not preserve the originating task result.");
    }

    console.log("");
    console.log("========================================");
    console.log("        AGENT RETURN PATH TEST");
    console.log("========================================");
    console.log("");
    console.log(`Return status       : ${returned.status}`);
    console.log(`Task ID             : ${taskId}`);
    console.log(`Conversation        : ${conversationId}`);
    console.log(`Result message      : ${returned.communicationMessageId}`);
    console.log(`Execution status    : ${agentResult.executionStatus}`);
    console.log(`Verified            : ${agentResult.verified}`);
    console.log("");
    console.log(
        "GREEN: agent results return through Communication Core with task and execution context preserved.",
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
