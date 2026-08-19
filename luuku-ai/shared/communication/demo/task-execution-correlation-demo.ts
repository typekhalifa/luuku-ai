import { prisma } from "../../database/client";
import { communicationExecutionService } from "../communication-execution.service";
import { CommunicationPolicyResult } from "../communication-policy";
import { CommunicationExecutionResult, CommunicationRequest } from "../types";

async function main(): Promise<void> {
    const taskId = `task-correlation-${Date.now()}`;
    const conversationId = `agent:research:sales:${taskId}`;
    const idempotencyKey = `task-execution-correlation/${taskId}`;

    // The execution ledger has a real FK to CommunicationConversation.
    // Create the canonical conversation first, then correlate the execution to it.
    const conversation = await prisma.communicationConversation.create({
        data: {
            channel: "internal",
            threadKey: conversationId,
            status: "active",
            participants: [
                {
                    channel: "internal",
                    externalId: "research-agent",
                    displayName: "Research Agent",
                },
                {
                    channel: "internal",
                    externalId: "sales-agent",
                    displayName: "Sales Agent",
                },
            ],
            metadata: {
                type: "agent-task-correlation-demo",
                taskId,
            },
        },
    });

    const request: CommunicationRequest = {
        capability: "email.send",
        channel: "email",
        recipientExternalId: "correlation@example.invalid",
        subject: "Task correlation test",
        body: "Simulated execution ledger correlation test.",
        metadata: {
            taskId,
            conversationId: conversation.id,
            idempotencyKey,
            audience: "internal",
            executionMode: "test",
        },
    };

    const policy: CommunicationPolicyResult = {
        decision: "allow",
        reason: "Correlation demo policy allows the test execution.",
    };

    try {
        const handle = await communicationExecutionService.start(
            request,
            policy,
        );

        const result: CommunicationExecutionResult = {
            capability: request.capability,
            channel: request.channel,
            status: "verified",
            executed: true,
            verified: true,
            evidence: {
                provider: "task-execution-correlation-demo",
                externalId: `correlation-demo/${taskId}`,
                details: {
                    taskId,
                    conversationId: conversation.id,
                },
            },
            summary: "Simulated execution correlated to the originating task.",
        };

        await communicationExecutionService.complete(handle.id, result);

        const ledger = await prisma.communicationExecution.findUnique({
            where: { id: handle.id },
        });

        if (!ledger) {
            throw new Error("Execution ledger record was not found.");
        }

        if (
            ledger.taskId !== taskId ||
            ledger.conversationId !== conversation.id ||
            ledger.status !== "verified" ||
            ledger.verified !== true
        ) {
            throw new Error(
                "Task, conversation, and verified execution correlation did not persist correctly.",
            );
        }

        console.log("");
        console.log("========================================");
        console.log("     TASK EXECUTION CORRELATION TEST");
        console.log("========================================");
        console.log("");
        console.log(`Task ID          : ${ledger.taskId}`);
        console.log(`Conversation      : ${ledger.conversationId}`);
        console.log(`Execution ID     : ${ledger.id}`);
        console.log(`Execution status : ${ledger.status}`);
        console.log(`Verified         : ${ledger.verified}`);
        console.log("");
        console.log(
            "GREEN: task, communication conversation, and verified execution are correlated in the existing ledger.",
        );
    } finally {
        await prisma.communicationConversation.delete({
            where: { id: conversation.id },
        });
    }

    await prisma.$disconnect();
}

main().catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
});
