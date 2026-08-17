import crypto from "crypto";

import { prisma } from "../../database/client";
import { prismaCommunicationService } from "../prisma-communication-service";
import { communicationRouter } from "../router";
import {
    CommunicationAdapter,
    CommunicationExecutionResult,
    CommunicationRequest,
} from "../types";

const idempotencyKey =
    `ledger-demo/${Date.now()}`;

const conversationId =
    crypto.randomUUID();

const demoAdapter: CommunicationAdapter = {
    capability: "email.send",
    channel: "internal",

    isAvailable(): boolean {
        return true;
    },

    async execute(
        request: CommunicationRequest,
    ): Promise<CommunicationExecutionResult> {
        return {
            capability: request.capability,
            channel: request.channel,
            status: "verified",
            executed: true,
            verified: true,
            evidence: {
                provider: "communication-ledger-demo",
                externalId: idempotencyKey,
                details: {
                    demo: true,
                },
            },
            summary:
                "Communication execution ledger demo adapter completed successfully.",
        };
    },
};

async function main(): Promise<void> {
    communicationRouter.register(demoAdapter);

    const result =
        await communicationRouter.execute({
            capability: "email.send",
            channel: "internal",
            recipient: "ledger-demo",
            body: "Execution ledger regression test.",
            metadata: {
                audience: "internal",
                executionMode: "test",
                idempotencyKey,
                taskId: "communication-ledger-demo",
            },
        });

    await prismaCommunicationService.sendMessage({
        conversationId,
        channel: "internal",
        recipient: {
            channel: "internal",
            externalId: "ledger-demo",
            displayName: "Ledger Demo",
        },
        content: "Execution ledger correlation regression test.",
        metadata: {
            idempotencyKey,
            externalMessageId: `message-${idempotencyKey}`,
            source: "communication-execution-ledger-demo",
        },
    });

    const execution =
        await prisma.communicationExecution.findUnique({
            where: { idempotencyKey },
        });

    const message =
        await prisma.communicationMessage.findFirst({
            where: {
                conversationId,
                externalMessageId: `message-${idempotencyKey}`,
            },
        });

    console.log("");
    console.log("========================================");
    console.log("   COMMUNICATION EXECUTION LEDGER TEST");
    console.log("========================================");
    console.log("");
    console.log(`Router status : ${result.status}`);
    console.log(`Executed      : ${result.executed}`);
    console.log(`Verified      : ${result.verified}`);
    console.log(`Ledger ID     : ${execution?.id ?? "missing"}`);
    console.log(`Ledger status : ${execution?.status ?? "missing"}`);
    console.log(`Provider      : ${execution?.provider ?? "missing"}`);
    console.log(`External ID   : ${execution?.externalId ?? "missing"}`);
    console.log(`Conversation  : ${execution?.conversationId ?? "missing"}`);
    console.log(`Message ID    : ${message?.id ?? "missing"}`);
    console.log("");

    if (
        result.status !== "verified" ||
        !result.executed ||
        !result.verified ||
        !execution ||
        execution.status !== "verified" ||
        execution.executed !== true ||
        execution.verified !== true ||
        execution.provider !== "communication-ledger-demo" ||
        execution.conversationId !== conversationId ||
        !message ||
        message.conversationId !== conversationId
    ) {
        throw new Error(
            "Communication execution ledger regression failed.",
        );
    }

    console.log(
        "GREEN: execution, provider result, conversation, and outbound message are correlated.",
    );
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
