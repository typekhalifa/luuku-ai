import crypto from "crypto";

import { prisma } from "../../database/client";
import { communicationObservability } from "..";

async function runDemo() {
    const conversationId = crypto.randomUUID();
    const messageIds: string[] = [];
    const executionIds: string[] = [];
    const eventIds: string[] = [];

    const baseline = await communicationObservability.getSnapshot();

    try {
        await prisma.communicationConversation.create({
            data: {
                id: conversationId,
                channel: "internal",
                participants: [
                    {
                        channel: "internal",
                        externalId: "founder",
                        displayName: "Founder",
                    },
                    {
                        channel: "internal",
                        externalId: "lex",
                        displayName: "LEX",
                    },
                ],
            },
        });

        const inboundMessage = await prisma.communicationMessage.create({
            data: {
                conversationId,
                direction: "inbound",
                role: "founder",
                content: "Show me the company communication state.",
                sender: {
                    channel: "internal",
                    externalId: "founder",
                    displayName: "Founder",
                },
            },
        });
        messageIds.push(inboundMessage.id);

        const outboundMessage = await prisma.communicationMessage.create({
            data: {
                conversationId,
                direction: "outbound",
                role: "agent",
                content: "Communication observability snapshot is ready.",
                sender: {
                    channel: "internal",
                    externalId: "lex",
                    displayName: "LEX",
                },
            },
        });
        messageIds.push(outboundMessage.id);

        const execution = await prisma.communicationExecution.create({
            data: {
                conversationId,
                taskId: "observability-demo-task",
                idempotencyKey: `observability-demo-${crypto.randomUUID()}`,
                capability: "communication.send",
                channel: "internal",
                audience: "founder",
                executionMode: "live",
                policyDecision: "ALLOW",
                policyReason: "authorized internal communication",
                status: "completed",
                executed: true,
                verified: true,
                provider: "internal",
                evidence: {
                    demo: true,
                    verifiedBy: "communication-observability-demo",
                },
            },
        });
        executionIds.push(execution.id);

        const event = await prisma.communicationEvent.create({
            data: {
                provider: "internal",
                providerEventId: `observability-demo-${crypto.randomUUID()}`,
                type: "communication.completed",
                externalId: execution.id,
                conversationId,
                payload: {
                    demo: true,
                    executionId: execution.id,
                },
            },
        });
        eventIds.push(event.id);

        const snapshot = await communicationObservability.getSnapshot(10);

        if (snapshot.messages.total < baseline.messages.total + 2) {
            throw new Error("Observability demo failed: message count did not increase");
        }

        if (snapshot.executions.total < baseline.executions.total + 1) {
            throw new Error("Observability demo failed: execution count did not increase");
        }

        if (snapshot.executions.verified < baseline.executions.verified + 1) {
            throw new Error("Observability demo failed: verified execution was not observed");
        }

        if (snapshot.events.total < baseline.events.total + 1) {
            throw new Error("Observability demo failed: event count did not increase");
        }

        if ((snapshot.channels.internal ?? 0) < (baseline.channels.internal ?? 0) + 1) {
            throw new Error("Observability demo failed: channel visibility did not increase");
        }

        const hasExecutionInTimeline = snapshot.timeline.some(
            (entry) => entry.id === execution.id && entry.source === "execution",
        );

        if (!hasExecutionInTimeline) {
            throw new Error("Observability demo failed: execution missing from unified timeline");
        }

        console.log("");
        console.log("========================================");
        console.log("   COMMUNICATION OBSERVABILITY DEMO");
        console.log("========================================");
        console.log("");
        console.log(`Messages      : ${snapshot.messages.total}`);
        console.log(`Conversations : ${snapshot.conversations.total}`);
        console.log(`Executions    : ${snapshot.executions.total}`);
        console.log(`Verified      : ${snapshot.executions.verified}`);
        console.log(`Events        : ${snapshot.events.total}`);
        console.log(`Internal msgs : ${snapshot.channels.internal ?? 0}`);
        console.log(`Timeline      : ${snapshot.timeline.length}`);
        console.log("");
        console.log("Unified communication observability passed.");
        console.log("");
    } finally {
        if (eventIds.length > 0) {
            await prisma.communicationEvent.deleteMany({
                where: { id: { in: eventIds } },
            });
        }

        if (executionIds.length > 0) {
            await prisma.communicationExecution.deleteMany({
                where: { id: { in: executionIds } },
            });
        }

        if (messageIds.length > 0) {
            await prisma.communicationMessage.deleteMany({
                where: { id: { in: messageIds } },
            });
        }

        await prisma.communicationConversation.deleteMany({
            where: { id: conversationId },
        });
    }
}

runDemo().catch((error) => {
    console.error("Communication observability demo failed:", error);
    process.exitCode = 1;
});
