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
    return message
        .trim()
        .toLowerCase()
        .replace(/[.!?,;:]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isFounderApproval(message: string): boolean {
    const normalized = normalizeMessage(message);

    return /^(?:yes|yep|yeah|approved?|approve|do it|go ahead|proceed|execute(?: it)?|make it happen|let'?s do it|handle it|start it)$/.test(
        normalized,
    ) || /^(?:yes|yep|yeah)\s+(?:please\s+)?(?:do it|go ahead|proceed|execute(?: it)?|make it happen|let'?s do it|handle it|start it)$/.test(
        normalized,
    );
}

function simpleCasualReply(message: string): string | null {
    const normalized = normalizeMessage(message);

    if (
        /^(?:hey|hi|hello|yo|sup|what'?s up|good morning|good afternoon|good evening)(?: lex| founder)?$/.test(
            normalized,
        ) ||
        /^(?:hey|hi|hello) lex$/.test(normalized) ||
        /^(?:thanks|thank you|nice|great|good job|well done)$/.test(normalized)
    ) {
        if (normalized.includes("good morning")) {
            return "Good morning, Founder 👋 I’m online and ready. What are we tackling today?";
        }

        if (normalized.includes("good afternoon")) {
            return "Good afternoon, Founder 👋 I’m here. What are we working on?";
        }

        if (normalized.includes("good evening")) {
            return "Good evening, Founder 👋 I’m here. What’s on the agenda?";
        }

        if (/^(?:thanks|thank you|nice|great|good job|well done)$/.test(normalized)) {
            return "Appreciate it, Founder 👊 What’s next?";
        }

        return "Hey Founder 👋 I’m here. What’s on your mind?";
    }

    return null;
}

function recentConversation(messages: CommunicationMessage[]): string {
    return messages
        .slice(-12)
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join("\n");
}

function inferProposedAction(
    response: LexStructuredResponse,
): LexProposedAction | null {
    if (
        response.actions.length === 0 ||
        (response.type !== "recommendation" && response.type !== "decision")
    ) {
        return null;
    }

    const agents = getAgents();

    for (const action of response.actions) {
        const normalized = action.toLowerCase();
        const target = agents.find((agent) =>
            normalized.includes(agent.id.toLowerCase()) ||
            normalized.includes(agent.name.toLowerCase()),
        );

        if (!target) continue;

        const isControlledTest =
            /controlled test contact|test follow-up email|autonomous communication system/i.test(
                action,
            );

        let description = action;

        if (isControlledTest) {
            const testEmail = process.env.LUUKU_TEST_CONTACT_EMAIL?.trim();
            const testCompany = process.env.LUUKU_TEST_CONTACT_COMPANY?.trim();

            if (!testEmail || !testCompany) {
                continue;
            }

            description = [
                action,
                `TEST_CONTACT_COMPANY: ${testCompany}`,
                `CONTACT_EMAIL: ${testEmail}`,
            ].join("\n");
        }

        const priority: LexProposedAction["priority"] =
            /urgent|immediately|critical|highest priority|asap/i.test(action)
                ? "high"
                : /low priority|when convenient/i.test(action)
                    ? "low"
                    : "medium";

        return {
            id: `lex-action:${randomUUID()}`,
            title: action,
            description,
            agentId: target.id,
            priority,
            requiresFounderApproval: true,
            proposedAt: new Date().toISOString(),
        };
    }

    return null;
}

function findLatestPendingAction(
    messages: CommunicationMessage[],
): LexProposedAction | null {
    const approvalIndex = messages.length - 1;

    // The approval must be the latest founder message, and the proposal must be
    // the most recent outbound proposal with no newer founder message between them.
    if (messages[approvalIndex]?.direction !== "inbound") {
        return null;
    }

    for (let index = approvalIndex - 1; index >= 0; index -= 1) {
        const message = messages[index];

        if (message.direction === "inbound") {
            return null;
        }

        const candidate = message.metadata?.proposedAction;
        if (!candidate || typeof candidate !== "object") continue;

        const action = candidate as Partial<LexProposedAction>;
        if (
            typeof action.id === "string" &&
            typeof action.title === "string" &&
            typeof action.description === "string" &&
            typeof action.agentId === "string" &&
            typeof action.proposedAt === "string" &&
            (action.priority === "low" ||
                action.priority === "medium" ||
                action.priority === "high")
        ) {
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
    }

    return null;
}

function hasCompletedAction(
    messages: CommunicationMessage[],
    actionId: string,
): boolean {
    return messages.some((message) =>
        message.direction === "outbound" &&
        message.metadata?.actionExecution === "completed" &&
        message.metadata?.actionId === actionId,
    );
}

function renderActionResult(
    action: LexProposedAction,
    result: Awaited<ReturnType<typeof runAgent>>,
    guardBlockers: string[] = [],
): string {
    if (guardBlockers.length > 0) {
        return [
            "🛑 **Action Blocked**",
            "",
            `**${action.title}**`,
            "",
            ...guardBlockers.map((blocker) => `• ${blocker}`),
            "",
            "No agent was dispatched.",
        ].join("\n");
    }

    const statusIcon = result.success ? "✅" : "⚠️";
    return [
        `${statusIcon} **Action ${result.success ? "Completed" : "Failed"}**`,
        "",
        `**${action.title}**`,
        "",
        `**Agent** • ${action.agentId}`,
        `**Status** • ${result.executionStatus ?? (result.success ? "completed" : "failed")}`,
        "",
        result.summary,
        ...(result.evidence
            ? ["", `**Evidence** • ${result.evidence.reference}`]
            : []),
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
        const conversation =
            await prismaCommunicationService.getConversation(message.conversationId);

        if (!conversation) {
            throw new Error(
                `Founder conversation ${message.conversationId} could not be loaded.`,
            );
        }

        if (isFounderApproval(message.content)) {
            const action = findLatestPendingAction(conversation.messages);

            if (!action) {
                return this.sendResponse(
                    message,
                    "💬 **No Pending Action**\n\nI don’t have a current executable proposal in this conversation. Ask me what I recommend, then approve that specific proposal.",
                    "action_request_missing",
                );
            }

            if (hasCompletedAction(conversation.messages, action.id)) {
                return this.sendResponse(
                    message,
                    "ℹ️ **Already Completed**\n\nThat approved action has already been executed. I won’t run it twice.",
                    "action_already_completed",
                );
            }

            const guard = guardExecutiveDecision(
                `${action.title}\n${action.description}`,
            );

            if (!guard.allowed) {
                const response = renderActionResult(
                    action,
                    {
                        success: false,
                        summary: "Execution was blocked by the executive capability guard.",
                        completedAt: new Date().toISOString(),
                        executionStatus: "blocked",
                        executed: false,
                        verified: false,
                        blockers: guard.blockers,
                    },
                    guard.blockers,
                );

                return this.sendResponse(
                    message,
                    response,
                    "action_blocked",
                    {
                        actionId: action.id,
                        actionExecution: "blocked",
                        blockers: guard.blockers,
                    },
                );
            }

            const result = await runAgent(action.agentId, {
                id: action.id,
                title: action.title,
                description: action.description,
                priority: action.priority,
            });

            const response = renderActionResult(action, result);

            return this.sendResponse(
                message,
                response,
                "action_executed",
                {
                    actionId: action.id,
                    actionExecution: result.success ? "completed" : "failed",
                    actionAgentId: action.agentId,
                    actionStatus: result.executionStatus ?? (result.success ? "completed" : "failed"),
                    actionVerified: result.verified ?? false,
                },
            );
        }

        const casualReply = simpleCasualReply(message.content);
        if (casualReply) {
            return this.sendResponse(message, casualReply, "casual");
        }

        const context = await buildExecutiveContext();
        const structured = await requestAIStructured<LexStructuredResponse>({
            prompt: [
                "You are LEX, the executive principal of Luuku AI.",
                "You are speaking directly with the founder through the company's internal Discord channel.",
                "Your job is to communicate like a sharp, warm, capable executive partner — not like a reporting dashboard.",
                "Understand the founder's intent before deciding how much information to provide.",
                "Use only facts supported by the company snapshot and conversation context.",
                "Do not invent metrics, completed work, agents, or capabilities.",
                "Operational actions must never be claimed as executed unless the execution result is explicitly supplied.",
                "Never execute, dispatch, assign, or imply approval merely because you generated a recommendation.",
                "A recommendation is only a proposal. Execution requires a later explicit founder approval message.",
                "",
                "CONVERSATION STYLE:",
                "- If the founder is greeting you, saying hello, thanking you, joking, or making simple small talk, respond naturally and briefly. Do not turn a greeting into a company report.",
                "- For casual messages, use 1-3 natural sentences. Keep sections and actions empty.",
                "- If the founder asks a simple direct question, answer the question first. Do not dump the entire company snapshot unless requested.",
                "- If the founder asks for a company update, give a concise executive briefing. Do not automatically turn the update into an execution plan.",
                "- Only propose operational actions when the founder asks what we should do, asks for a recommendation, asks for next steps, or explicitly asks you to take/assign an action.",
                "- If an action is proposed, make the approval boundary obvious: the founder must explicitly approve it before execution.",
                "- Sound like a real executive teammate. Prefer natural transitions such as 'Here’s what I’m seeing', 'The main issue is', or 'I’d prioritize' when appropriate.",
                "- Do not make every response sound like a formal report. Use structure only when it improves clarity.",
                "",
                "ACTION SAFETY:",
                "- Actions may only be proposed in recommendation or decision responses.",
                "- Casual, question, and ordinary company_update responses should normally have an empty actions array unless the founder explicitly requested an operational action.",
                "- When recommending an operational action that can be assigned to a currently registered agent, put that action in actions and name the responsible registered agent and concrete operation.",
                "- If the operation communicates externally, explicitly name the channel so the existing capability guard can evaluate it.",
                "- Never treat a sentence, recommendation, task description, or generic business phrase as a company or prospect name.",
                "- Research should only be requested for an explicitly named organization, person, or market. If there is no explicit target, do not invent one.",
                "",
                "CONTROLLED TEST CONTACT RULE:",
                "- If the founder asks for a controlled test email, do not invent a recipient email or company.",
                "- The exact test identity is supplied below through LUUKU_TEST_CONTACT_EMAIL and LUUKU_TEST_CONTACT_COMPANY.",
                "- If either value is missing, explain that the controlled test identity has not been configured and do not propose an executable external email action.",
                "- If both are supplied, the executable action must target that exact company and email.",
                "- Never substitute a real prospect such as Rwanda Revenue Authority for the controlled test contact.",
                "",
                "Choose the response type:",
                "- company_update",
                "- analysis",
                "- recommendation",
                "- decision",
                "- question",
                "- casual",
                "",
                "Presentation rules:",
                "- title should be short and human; for casual messages it can be a simple greeting or omitted",
                "- summary should normally be 1-3 concise sentences",
                "- sections should be used only when they genuinely help explain something",
                "- bullets must be concrete and useful",
                "- actions should be ordered from highest priority to lowest",
                "- closing_question should be empty unless a response from the founder is genuinely useful",
                "- do not include Markdown syntax, emojis, numbering, or decorative formatting inside fields; the renderer handles presentation",
                "",
                `FOUNDER MESSAGE:\n${message.content}`,
                "",
                `RECENT CONVERSATION:\n${recentConversation(conversation.messages) || "No prior messages."}`,
                "",
                `CONTROLLED TEST CONTACT CONFIGURATION:\n${JSON.stringify(
                    {
                        email: process.env.LUUKU_TEST_CONTACT_EMAIL || null,
                        company: process.env.LUUKU_TEST_CONTACT_COMPANY || null,
                    },
                    null,
                    2,
                )}`,
                "",
                `CURRENT COMPANY SNAPSHOT:\n${JSON.stringify(
                    {
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
                    },
                    null,
                    2,
                )}`,
                "",
                "Return only the structured response required by the schema.",
            ].join("\n"),
            schemaName: "lex_founder_operating_response",
            schema: LEX_RESPONSE_SCHEMA,
        });

        const proposedAction = inferProposedAction(structured);
        const responseMessages = renderLexDiscordMessages(structured);

        return this.sendResponse(
            message,
            responseMessages,
            structured.type,
            proposedAction
                ? {
                      proposedAction,
                  }
                : undefined,
        );
    }

    private async sendResponse(
        message: CommunicationMessage,
        response: string | string[],
        responseType: string,
        extraMetadata: Record<string, unknown> = {},
    ) {
        const responseMessages = Array.isArray(response) ? response : [response];
        const idempotencyBase = `founder-lex-operating-response:${message.id}`;

        for (let index = 0; index < responseMessages.length; index += 1) {
            const content = responseMessages[index].trim();
            if (!content) continue;

            const idempotencyKey = `${idempotencyBase}:${index + 1}`;
            const partMetadata = {
                audience: "internal",
                executionMode: "live",
                conversationId: message.conversationId,
                taskId: `founder-lex-operating-response-${message.id}-${index + 1}`,
                idempotencyKey,
                source: "founder-lex-operating-responder",
                inboundMessageId: message.id,
                responseType,
                responsePart: index + 1,
                responseParts: responseMessages.length,
                ...(index === 0 ? extraMetadata : {}),
            };

            const execution = await communicationRouter.execute({
                capability: "discord.send",
                channel: "discord",
                target: "founder",
                body: content,
                metadata: partMetadata,
            });

            if (!execution.executed || !execution.verified) {
                throw new Error(
                    `LEX Discord response part ${index + 1} was not verified: ${execution.summary}`,
                );
            }

            await prismaCommunicationService.sendMessage({
                conversationId: message.conversationId,
                channel: "discord",
                recipient: {
                    channel: "discord",
                    displayName: "Founder",
                },
                content,
                metadata: {
                    ...partMetadata,
                    executionStatus: execution.status,
                    verified: execution.verified,
                    responseId: randomUUID(),
                },
            });
        }

        return {
            response: responseMessages.filter(Boolean).join("\n\n"),
            executionStatus: "verified",
            executed: true,
            verified: true,
            conversationId: message.conversationId,
        };
    }
}

export const founderLexOperatingResponder =
    new FounderLexOperatingResponder();
