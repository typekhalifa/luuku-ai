import { randomUUID } from "node:crypto";

import { requestAIStructured } from "../ai/client";
import { buildExecutiveContext } from "../../agents/executive-ai/brain";
import { getAgents } from "../agents/registry";
import { runAgent } from "../agents/runner";
import { guardExecutiveDecision } from "../executive/decision-guard";
import { CommunicationMessage } from "./message";
import { prismaCommunicationService } from "./prisma-communication-service";
import { communicationRouter } from "./router";
import {
    LEX_RESPONSE_SCHEMA,
    LexStructuredResponse,
    renderLexDiscordMessages,
} from "./lex-response";

export interface LexProposedAction {
    id: string;
    title: string;
    description: string;
    agentId: string;
    priority: "low" | "medium" | "high";
    requiresFounderApproval: true;
    proposedAt: string;
}

function normalizeMessage(message: string): string {
    return message.trim().toLowerCase().replace(/[.!?,;:]+/g, " ").replace(/\s+/g, " ").trim();
}

function isFounderApproval(message: string): boolean {
    const normalized = normalizeMessage(message);
    return /^(?:yes|yep|yeah|approved?|approve|do it|go ahead|proceed|execute(?: it)?|make it happen|let'?s do it|handle it|start it)$/.test(normalized)
        || /^(?:yes|yep|yeah)\s+(?:please\s+)?(?:do it|go ahead|proceed|execute(?: it)?|make it happen|let'?s do it|handle it|start it)$/.test(normalized);
}

function simpleCasualReply(message: string): string | null {
    const normalized = normalizeMessage(message);
    if (!/^(?:hey|hi|hello|yo|sup|what'?s up|good morning|good afternoon|good evening)(?: lex| founder)?$/.test(normalized)
        && !/^(?:hey|hi|hello) lex$/.test(normalized)
        && !/^(?:thanks|thank you|nice|great|good job|well done)$/.test(normalized)) return null;
    if (normalized.includes("good morning")) return "Good morning, Founder 👋 I’m online and ready. What are we tackling today?";
    if (normalized.includes("good afternoon")) return "Good afternoon, Founder 👋 I’m here. What are we working on?";
    if (normalized.includes("good evening")) return "Good evening, Founder 👋 I’m here. What’s on the agenda?";
    if (/^(?:thanks|thank you|nice|great|good job|well done)$/.test(normalized)) return "Appreciate it, Founder 👊 What’s next?";
    return "Hey Founder 👋 I’m here. What’s on your mind?";
}

function recentConversation(messages: CommunicationMessage[]): string {
    return messages.slice(-12).map(message => `${message.role.toUpperCase()}: ${message.content}`).join("\n");
}

function isControlledTestEmailRequest(message: string): boolean {
    return /\b(?:send|email|test)\b[^\n]{0,120}\b(?:test email|email system|communication system|controlled test)\b|\bcontrolled test email\b|\btest follow-up email\b|\bautonomous (?:email|communication) system\b/i.test(message);
}

function salesAgentId(): string | undefined {
    const agents = getAgents();
    return agents.find(agent => agent.id.toLowerCase() === "sales")?.id
        ?? agents.find(agent => /sales/i.test(`${agent.id} ${agent.name}`))?.id;
}

function buildControlledTestProposal(): LexProposedAction | null {
    const testEmail = process.env.LUUKU_TEST_CONTACT_EMAIL?.trim();
    const testCompany = process.env.LUUKU_TEST_CONTACT_COMPANY?.trim();
    const agentId = salesAgentId();
    if (!testEmail || !testCompany || !agentId) return null;

    const title = `Send controlled test email to ${testEmail}`;
    return {
        id: `lex-action:${randomUUID()}`,
        title,
        description: [
            title,
            `TEST_CONTACT_COMPANY: ${testCompany}`,
            `CONTACT_EMAIL: ${testEmail}`,
            "CONTROLLED_TEST_EMAIL=true",
        ].join("\n"),
        agentId,
        priority: "medium",
        requiresFounderApproval: true,
        proposedAt: new Date().toISOString(),
    };
}

function inferProposedAction(
    response: LexStructuredResponse,
    founderMessage: string,
): LexProposedAction | null {
    // Controlled test email requests are handled deterministically before the
    // response-type gate. The LLM must never be able to classify an explicit
    // send request as a company_update and thereby claim it was sent.
    if (isControlledTestEmailRequest(founderMessage)) {
        return buildControlledTestProposal();
    }

    if (response.type !== "recommendation" && response.type !== "decision") return null;
    if (response.actions.length === 0) return null;

    const agents = getAgents();
    for (const action of response.actions) {
        const normalized = action.toLowerCase();
        const target = agents.find(agent => normalized.includes(agent.id.toLowerCase()) || normalized.includes(agent.name.toLowerCase()));
        if (!target) continue;
        const priority: LexProposedAction["priority"] = /urgent|immediately|critical|highest priority|asap/i.test(action)
            ? "high"
            : /low priority|when convenient/i.test(action) ? "low" : "medium";
        return {
            id: `lex-action:${randomUUID()}`,
            title: action,
            description: action,
            agentId: target.id,
            priority,
            requiresFounderApproval: true,
            proposedAt: new Date().toISOString(),
        };
    }
    return null;
}

function findLatestPendingAction(messages: CommunicationMessage[]): LexProposedAction | null {
    const approvalIndex = messages.length - 1;
    if (messages[approvalIndex]?.direction !== "inbound") return null;
    for (let index = approvalIndex - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message.direction === "inbound") return null;
        const candidate = message.metadata?.proposedAction;
        if (!candidate || typeof candidate !== "object") continue;
        const action = candidate as Partial<LexProposedAction>;
        if (typeof action.id !== "string' || typeof action.title !== "string" || typeof action.description !== "string" || typeof action.agentId !== "string" || typeof action.proposedAt !== "string") continue;
        if (action.priority !== "low" && action.priority !== "medium" && action.priority !== "high") continue;
        return {
            id: action.id,
            title: action.title,
            description: action.description,
            agentId: action.agentId,
            priority: action.priority,
            requiresFounderApproval: true,
            proposedAt: action.proposedAt,
        };
    }
    return null;
}

function hasCompletedAction(messages: CommunicationMessage[], actionId: string): boolean {
    return messages.some(message => message.direction === "outbound" && message.metadata?.actionExecution === "completed" && message.metadata?.actionId === actionId);
}

function renderActionResult(action: LexProposedAction, result: Awaited<ReturnType<typeof runAgent>>, guardBlockers: string[] = []): string {
    if (guardBlockers.length > 0) {
        return ["🛑 **Action Blocked**", "", `**${action.title}**`, "", ...guardBlockers.map(blocker => `• ${blocker}`), "", "No agent was dispatched."].join("\n");
    }
    return [
        `${result.success ? "✅" : "⚠️"} **Action ${result.success ? "Completed" : "Failed"}**`,
        "",
        `**${action.title}**`,
        "",
        `**Agent** • ${action.agentId}`,
        `**Status** • ${result.executionStatus ?? (result.success ? "completed" : "failed")}`,
        "",
        result.summary,
        ...(result.evidence ? ["", `**Evidence** • ${result.evidence.reference}`] : []),
    ].join("\n");
}

export class FounderLexOperatingResponder {
    async respond(message: CommunicationMessage): Promise<{
        response: string;
        executionStatus: string;
        executed: boolean;
        verified: boolean;
        conversationId: string;
    }> {
        const conversation = await prismaCommunicationService.getConversation(message.conversationId);
        if (!conversation) throw new Error(`Founder conversation ${message.conversationId} could not be loaded.`);

        if (isFounderApproval(message.content)) {
            const action = findLatestPendingAction(conversation.messages);
            if (!action) return this.sendResponse(message, "💬 **No Pending Action**\n\nI don’t have a current executable proposal in this conversation. Ask me what I recommend, then approve that specific proposal.", "action_request_missing");
            if (hasCompletedAction(conversation.messages, action.id)) return this.sendResponse(message, "ℹ️ **Already Completed**\n\nThat approved action has already been executed. I won’t run it twice.", "action_already_completed");

            const guard = guardExecutiveDecision(`${action.title}\n${action.description}`);
            if (!guard.allowed) {
                return this.sendResponse(message, renderActionResult(action, {
                    success: false,
                    summary: "Execution was blocked by the executive capability guard.",
                    completedAt: new Date().toISOString(),
                    executionStatus: "blocked",
                    executed: false,
                    verified: false,
                    blockers: guard.blockers,
                }, guard.blockers), "action_blocked", { actionId: action.id, actionExecution: "blocked", blockers: guard.blockers });
            }

            const result = await runAgent(action.agentId, {
                id: action.id,
                title: action.title,
                description: action.description,
                priority: action.priority,
            });
            return this.sendResponse(message, renderActionResult(action, result), "action_executed", {
                actionId: action.id,
                actionExecution: result.success ? "completed" : "failed",
                actionAgentId: action.agentId,
                actionStatus: result.executionStatus ?? (result.success ? "completed" : "failed"),
                actionVerified: result.verified ?? false,
            });
        }

        const casualReply = simpleCasualReply(message.content);
        if (casualReply) return this.sendResponse(message, casualReply, "casual");

        const controlledTestProposal = isControlledTestEmailRequest(message.content)
            ? buildControlledTestProposal()
            : null;

        // Explicit controlled-test email requests never go through the LLM for
        // the decision itself. This prevents a model response from claiming an
        // email was sent when no Sales Agent execution happened.
        if (controlledTestProposal) {
            const response = [
                "🎯 **Controlled Test Email Ready**",
                "",
                `I’ve prepared the controlled test email for **${process.env.LUUKU_TEST_CONTACT_EMAIL}** at **${process.env.LUUKU_TEST_CONTACT_COMPANY}**.`,
                "",
                "Nothing has been sent yet. Explicit founder approval is required.",
                "",
                "**Next move**",
                "1. Approve with `Do it`",
            ].join("\n");
            return this.sendResponse(message, response, "recommendation", { proposedAction: controlledTestProposal });
        }

        const context = await buildExecutiveContext();
        const structured = await requestAIStructured<LexStructuredResponse>({
            prompt: [
                "You are LEX, the executive principal of Luuku AI.",
                "You are speaking directly with the founder through the company's internal Discord channel.",
                "Communicate like a sharp, warm, capable executive partner, not a reporting dashboard.",
                "Understand the founder's intent before deciding how much information to provide.",
                "Use only facts supported by the company snapshot and conversation context. Do not invent metrics, completed work, agents, or capabilities.",
                "Never execute, dispatch, assign, or imply approval merely because you generated a recommendation. A recommendation is only a proposal.",
                "Never claim an external email, call, meeting, or other communication happened unless the execution result is explicitly supplied.",
                "Greetings and small talk should be brief and natural. Simple questions should be answered directly. Company updates should not automatically become action plans.",
                "Only propose operational actions when the founder asks what we should do, asks for a recommendation/next steps, or explicitly asks you to take or assign an action.",
                "If an action is proposed, make the approval boundary obvious. Founder approval is required before execution.",
                "Sound like a real executive teammate. Use structure only when it improves clarity.",
                "Actions may only be proposed in recommendation or decision responses.",
                "When recommending an operational action, name the responsible registered agent and concrete operation when possible.",
                "Never treat a sentence, recommendation, task description, or generic business phrase as a company or prospect name. Research only an explicitly named organization, person, or market.",
                "CONTROLLED TEST EMAIL: Explicit controlled test requests are handled by the operating layer and must target only the configured test contact.",
                "Choose one response type: company_update, analysis, recommendation, decision, question, casual.",
                "Presentation: title short and human; summary normally 1-3 concise sentences; use sections only when useful; actions ordered by priority; closing_question only when useful; do not put Markdown/emojis/numbering inside fields.",
                `FOUNDER MESSAGE:\n${message.content}`,
                `RECENT CONVERSATION:\n${recentConversation(conversation.messages) || "No prior messages."}`,
                `CONTROLLED TEST CONTACT CONFIGURATION:\n${JSON.stringify({ email: process.env.LUUKU_TEST_CONTACT_EMAIL || null, company: process.env.LUUKU_TEST_CONTACT_COMPANY || null }, null, 2)}`,
                `CURRENT COMPANY SNAPSHOT:\n${JSON.stringify({ systemHealth: context.systemHealth, currentTimeLocal: context.currentTimeLocal, crm: context.crm, insights: context.insights, intelligence: context.intelligence, agentHealth: context.agentHealth, objectives: context.objectives, schedule: context.schedule, capabilities: context.capabilities, availableAgents: context.availableAgents }, null, 2)}`,
                "Return only the structured response required by the schema.",
            ].join("\n"),
            schemaName: "lex_founder_operating_response",
            schema: LEX_RESPONSE_SCHEMA,
        });

        const proposedAction = inferProposedAction(structured, message.content);
        return this.sendResponse(message, renderLexDiscordMessages(structured), structured.type, proposedAction ? { proposedAction } : undefined);
    }

    private async sendResponse(message: CommunicationMessage, response: string | string[], responseType: string, extraMetadata: Record<string, unknown> = {}) {
        const responseMessages = Array.isArray(response) ? response : [response];
        const idempotencyBase = `founder-lex-operating-response:${message.id}`;
        for (let index = 0; index < responseMessages.length; index += 1) {
            const content = responseMessages[index].trim();
            if (!content) continue;
            const partMetadata = {
                audience: "internal",
                executionMode: "live",
                conversationId: message.conversationId,
                taskId: `founder-lex-operating-response-${message.id}-${index + 1}`,
                idempotencyKey: `${idempotencyBase}:${index + 1}`,
                source: "founder-lex-operating-responder",
                inboundMessageId: message.id,
                responseType,
                responsePart: index + 1,
                responseParts: responseMessages.length,
                ...(index === 0 ? extraMetadata : {}),
            };
            const execution = await communicationRouter.execute({ capability: "discord.send", channel: "discord", target: "founder", body: content, metadata: partMetadata });
            if (!execution.executed || !execution.verified) throw new Error(`LEX Discord response part ${index + 1} was not verified: ${execution.summary}`);
            await prismaCommunicationService.sendMessage({
                conversationId: message.conversationId,
                channel: "discord",
                recipient: { channel: "discord", displayName: "Founder" },
                content,
                metadata: { ...partMetadata, executionStatus: execution.status, verified: execution.verified, responseId: randomUUID() },
            });
        }
        return { response: responseMessages.filter(Boolean).join("\n\n"), executionStatus: "verified", executed: true, verified: true, conversationId: message.conversationId };
    }
}

export const founderLexOperatingResponder = new FounderLexOperatingResponder();
