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
    renderLexDiscordResponse,
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

function isFounderApproval(message: string): boolean {
    const normalized = message
        .trim()
        .toLowerCase()
        .replace(/[.!?,;:]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return /^(?:yes|yep|yeah|approved?|approve|do it|go ahead|proceed|execute(?: it)?|make it happen|let'?s do it|handle it|start it)$/.test(
        normalized,
    ) || /^(?:yes|yep|yeah)\s+(?:please\s+)?(?:do it|go ahead|proceed|execute(?: it)?|make it happen|let'?s do it|handle it|start it)$/.test(
        normalized,
    );
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
    if (response.actions.length === 0) return null;

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
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message.direction !== "outbound") continue;

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
                    "💬 **No Pending Action**\n\nI don't have a current executable proposal in this conversation. Ask me for the recommendation again, then approve that specific proposal.",
                    "action_request_missing",
                );
            }

            if (hasCompletedAction(conversation.messages, action.id)) {
                return this.sendResponse(
                    message,
                    "ℹ️ **Already Completed**\n\nThat approved action has already been executed. I won't run it twice.",
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

        const context = await buildExecutiveContext();
        const structured = await requestAIStructured<LexStructuredResponse>({
            prompt: [
                "You are LEX, the executive principal of Luuku AI.",
                "You are speaking directly with the founder through the company's internal Discord channel.",
                "Think like an executive, but return a structured communication plan for the presentation layer.",
                "Use only facts supported by the company snapshot and conversation context.",
                "Do not invent metrics, completed work, agents, or capabilities.",
                "Operational actions must never be claimed as executed unless the execution result is explicitly supplied.",
                "When recommending an operational action that can be assigned to a currently registered agent, put that action in actions and make it execution-ready after explicit founder approval.",
                "Execution-ready means naming the responsible registered agent and the concrete operation it should perform. If the operation communicates externally, explicitly name the channel (for example email) so the existing capability guard can evaluate it.",
                "Never assume founder approval. A recommendation is not an execution command.",
                "",
                "CONTROLLED TEST CONTACT RULE:",
                "- If the founder asks for a controlled test email, do not invent a recipient email or company.",
                "- The exact test identity is supplied below through LUUKU_TEST_CONTACT_EMAIL and LUUKU_TEST_CONTACT_COMPANY.",
                "- If either value is missing, explain that the controlled test identity has not been configured and do not propose an executable external email action.",
                "- If both are supplied, the executable action must target that exact company and email.",
                "- Never substitute a prospect such as Rwanda Revenue Authority for the controlled test contact.",
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
                "- title should be short and executive-friendly",
                "- summary should be 1-3 concise sentences",
                "- use sections only when they improve clarity",
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
        const response = renderLexDiscordResponse(structured);

        return this.sendResponse(
            message,
            response,
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
        response: string,
        responseType: string,
        extraMetadata: Record<string, unknown> = {},
    ) {
        const idempotencyKey = `founder-lex-operating-response:${message.id}`;
        const execution = await communicationRouter.execute({
            capability: "discord.send",
            channel: "discord",
            target: "founder",
            body: response,
            metadata: {
                audience: "internal",
                executionMode: "live",
                conversationId: message.conversationId,
                taskId: `founder-lex-operating-response-${message.id}`,
                idempotencyKey,
                source: "founder-lex-operating-responder",
                inboundMessageId: message.id,
                responseType,
                ...extraMetadata,
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
                source: "founder-lex-operating-responder",
                executionStatus: execution.status,
                verified: execution.verified,
                idempotencyKey,
                inboundMessageId: message.id,
                responseId: randomUUID(),
                responseType,
                ...extraMetadata,
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

export const founderLexOperatingResponder =
    new FounderLexOperatingResponder();
