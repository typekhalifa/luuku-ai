import { randomUUID } from "node:crypto";

import { requestAIStructured } from "../ai/client";
import { buildExecutiveContext } from "../../agents/executive-ai/brain";
import { CommunicationMessage } from "./message";
import { prismaCommunicationService } from "./prisma-communication-service";
import { communicationRouter } from "./router";
import {
    LEX_RESPONSE_SCHEMA,
    LexStructuredResponse,
    renderLexDiscordResponse,
} from "./lex-response";

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
        "Think like an executive, but return a structured communication plan for the presentation layer.",
        "Use only facts supported by the company snapshot and conversation context.",
        "Do not invent metrics, completed work, agents, or capabilities.",
        "If the founder asks for an action, recommend or describe the next step rather than pretending the action was executed.",
        "Operational actions must go through Luuku's existing task, policy, review, and communication execution systems.",
        "",
        "Choose the response type based on the conversation:",
        "- company_update: current company health, metrics, status, priorities",
        "- analysis: diagnosis, tradeoffs, causes, or interpretation",
        "- recommendation: what LEX thinks the founder should do next",
        "- decision: a clear executive choice or proposed direction",
        "- question: when LEX needs a decision or clarification from the founder",
        "- casual: normal conversational exchange that does not need a business layout",
        "",
        "Presentation rules:",
        "- title should be short and executive-friendly",
        "- summary should be 1-3 concise sentences",
        "- use sections only when they improve clarity",
        "- bullets must be concrete and useful",
        "- actions should be ordered from highest priority to lowest",
        "- closing_question should be empty unless a response from the founder is genuinely useful",
        "- for casual responses, sections and actions may be empty",
        "- do not include Markdown syntax, emojis, numbering, or decorative formatting inside fields; the renderer handles presentation",
        "",
        `FOUNDER MESSAGE:\n${message.content}`,
        "",
        `RECENT CONVERSATION:\n${recentConversation(conversationMessages) || "No prior messages."}`,
        "",
        `CURRENT COMPANY SNAPSHOT:\n${JSON.stringify(companySnapshot, null, 2)}`,
        "",
        "Return only the structured response required by the schema.",
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
        const structured = await requestAIStructured<LexStructuredResponse>({
            prompt: buildFounderPrompt(message, conversation.messages, context),
            schemaName: "lex_founder_response",
            schema: LEX_RESPONSE_SCHEMA,
        });

        const response = renderLexDiscordResponse(structured);
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
                responseType: structured.type,
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
                responseType: structured.type,
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
