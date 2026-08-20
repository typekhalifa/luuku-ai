import { randomUUID } from "node:crypto";

import { requestAI } from "../ai/client";
import { buildExecutiveContext } from "../../agents/executive-ai/brain";
import { CommunicationMessage } from "./message";
import { prismaCommunicationService } from "./prisma-communication-service";
import { communicationRouter } from "./router";

function recentConversation(messages: CommunicationMessage[]): string {
    return messages
        .slice(-10)
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join("\n");
}

function buildFounderPrompt(
    message: CommunicationMessage,
    conversationMessages: CommunicationMessage[],
    context: Awaited<ReturnType<typeof buildExecutiveContext>>,
): string {
    const companySnapshot = {
        systemHealth: context.systemHealth,
        currentTimeLocal: context.currentTimeLocal,
        crm: context.crm,
        insights: context.insights,
        intelligence: context.intelligence,
        agentHealth: context.agentHealth,
        objectives: context.objectives,
        schedule: context.schedule,
        capabilities: context.capabilities,
        availableAgents: context.availableAgents,
    };

    return [
        "You are LEX, the executive principal of Luuku AI.",
        "You are speaking directly with the founder through the company's internal Discord channel.",
        "Answer the founder clearly, concisely, and with executive judgment.",
        "Use only facts supported by the company snapshot and conversation context.",
        "Do not invent metrics, completed work, agents, or capabilities.",
        "If the founder asks for an action, explain the next step rather than pretending the action was executed.",
        "This turn is a conversational response; operational actions must go through Luuku's existing task, policy, review, and communication execution systems.",
        "",
        `FOUNDER MESSAGE:\n${message.content}`,
        "",
        `RECENT CONVERSATION:\n${recentConversation(conversationMessages) || "No prior messages."}`,
        "",
        `CURRENT COMPANY SNAPSHOT:\n${JSON.stringify(companySnapshot, null, 2)}`,
        "",
        "Return only the response that should be sent to the founder.",
    ].join("\n");
}

export interface FounderLexResponseResult {
    response: string;
    executionStatus: string;
    executed: boolean;
    verified: boolean;
    conversationId: string;
}

export class FounderLexResponder {
    async respond(message: CommunicationMessage): Promise<FounderLexResponseResult> {
        const conversation =
            await prismaCommunicationService.getConversation(message.conversationId);

        if (!conversation) {
            throw new Error(
                `Founder conversation ${message.conversationId} could not be loaded.`,
            );
        }

        const context = await buildExecutiveContext();
        const response = await requestAI({
            prompt: buildFounderPrompt(message, conversation.messages, context),
            temperature: 0.2,
        });

        const idempotencyKey = `founder-lex-response:${message.id}`;

        const execution = await communicationRouter.execute({
            capability: "discord.send",
            channel: "discord",
            target: "founder",
            body: response,
            metadata: {
                audience: "internal",
                executionMode: "live",
                conversationId: message.conversationId,
                taskId: `founder-lex-response-${message.id}`,
                idempotencyKey,
                source: "founder-lex-responder",
                inboundMessageId: message.id,
            },
        });

        if (!execution.executed || !execution.verified) {
            throw new Error(
                `LEX Discord response was not verified: ${execution.summary}`,
            );
        }

        await prismaCommunicationService.sendMessage({
            conversationId: message.conversationId,
            channel: "discord",
            recipient: {
                channel: "discord",
                displayName: "Founder",
            },
            content: response,
            metadata: {
                source: "founder-lex-responder",
                executionStatus: execution.status,
                verified: execution.verified,
                idempotencyKey,
                inboundMessageId: message.id,
                responseId: randomUUID(),
            },
        });

        return {
            response,
            executionStatus: execution.status,
            executed: execution.executed,
            verified: execution.verified,
            conversationId: message.conversationId,
        };
    }
}

export const founderLexResponder = new FounderLexResponder();
