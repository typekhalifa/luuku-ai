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
    LexActionContract,
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
    contract: LexActionContract;
}

function normalizeMessage(message: string): string {
    return message.trim().toLowerCase().replace(/[.!?,;:]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeAgentKey(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
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
    return agents.find(agent => normalizeAgentKey(agent.id) === "sales")?.id
        ?? agents.find(agent => normalizeAgentKey(agent.name).includes("sales"))?.id;
}

function resolveAgentId(contract: LexActionContract): string | undefined {
    const agents = getAgents();
    const requested = normalizeAgentKey(contract.agent_id);

    const exact = agents.find(agent => normalizeAgentKey(agent.id) === requested)
        ?? agents.find(agent => normalizeAgentKey(agent.name) === requested);
    if (exact) return exact.id;

    const loose = agents.find(agent => {
        const id = normalizeAgentKey(agent.id);
        const name = normalizeAgentKey(agent.name);
        return id.includes(requested) || requested.includes(id) || name.includes(requested) || requested.includes(name);
    });
    if (loose) return loose.id;

    if (/^crm\./i.test(contract.operation) || contract.operation === "email.send") {
        return salesAgentId();
    }

    if (contract.operation === "research.enrich") {
        return agents.find(agent => /research/i.test(`${agent.id} ${agent.name}`))?.id;
    }

    return undefined;
}

function buildControlledTestProposal(): LexProposedAction | null {
    const testEmail = process.env.LUUKU_TEST_CONTACT_EMAIL?.trim();
    const testCompany = process.env.LUUKU_TEST_CONTACT_COMPANY?.trim();
    const agentId = salesAgentId();
    if (!testEmail || !testCompany || !agentId) return null;

    const contract: LexActionContract = {
        enabled: true,
        agent_id: agentId,
        operation: "email.send",
        target: testEmail,
        priority: "medium",
        approval_required: true,
    };

    const title = `Send controlled test email to ${testEmail}`;
    return {
        id: `lex-action:${randomUUID()}`,
        title,
        description: [
            title,
            `TEST_CONTACT_COMPANY: ${testCompany}`,
            `CONTACT_EMAIL: ${testEmail}`,
            "CONTROLLED_TEST_EMAIL=true",
            `ACTION_OPERATION=${contract.operation}`,
            `ACTION_TARGET=${contract.target}`,
            "ACTION_APPROVAL_REQUIRED=true",
        ].join("\n"),
        agentId,
        priority: contract.priority,
        requiresFounderApproval: true,
        proposedAt: new Date().toISOString(),
        contract,
    };
}

function inferProposedAction(response: LexStructuredResponse, founderMessage: string): LexProposedAction | null {
    if (isControlledTestEmailRequest(founderMessage)) return buildControlledTestProposal();
    if (response.type !== "recommendation" && response.type !== "decision") return null;
    if (!response.action_contract.enabled || !response.action_contract.approval_required) return null;

    const contract = response.action_contract;
    const resolvedAgentId = resolveAgentId(contract);
    if (!resolvedAgentId) return null;

    const normalizedContract: LexActionContract = {
        ...contract,
        agent_id: resolvedAgentId,
        approval_required: true,
    };
    const actionText = response.actions[0]?.trim()
        || response.summary.trim()
        || `Execute ${normalizedContract.operation} for ${normalizedContract.target}`;

    return {
        id: `lex-action:${randomUUID()}`,
        title: actionText,
        description: [
            actionText,
            `ACTION_AGENT=${resolvedAgentId}`,
            `ACTION_OPERATION=${normalizedContract.operation}`,
            `ACTION_TARGET=${normalizedContract.target}`,
            `ACTION_PRIORITY=${normalizedContract.priority}`,
            "ACTION_APPROVAL_REQUIRED=true",
        ].join("\n"),
        agentId: resolvedAgentId,
        priority: normalizedContract.priority,
        requiresFounderApproval: true,
        proposedAt: new Date().toISOString(),
        contract: normalizedContract,
    };
}

function readProposedAction(candidate: unknown): LexProposedAction | null {
    if (!candidate || typeof candidate !== "object") return null;
    const action = candidate as Partial<LexProposedAction>;
    if (typeof action.id !== "string" || typeof action.title !== "string" || typeof action.description !== "string" || typeof action.proposedAt !== "string") return null;
    if (action.priority !== "low" && action.priority !== "medium" && action.priority !== "high") return null;

    const contractCandidate = action.contract;
    const fallbackAgent = typeof action.agentId === "string" ? action.agentId : "";
    const contract: LexActionContract = contractCandidate && typeof contractCandidate === "object"
        ? {
            enabled: contractCandidate.enabled === true,
            agent_id: typeof contractCandidate.agent_id === "string" ? contractCandidate.agent_id : fallbackAgent,
            operation: typeof contractCandidate.operation === "string" ? contractCandidate.operation : "agent.execute",
            target: typeof contractCandidate.target === "string" ? contractCandidate.target : action.title,
            priority: contractCandidate.priority === "low" || contractCandidate.priority === "high" ? contractCandidate.priority : action.priority,
            approval_required: contractCandidate.approval_required !== false,
        }
        : {
            enabled: true,
            agent_id: fallbackAgent,
            operation: "agent.execute",
            target: action.title,
            priority: action.priority,
            approval_required: true,
        };

    const resolvedAgentId = resolveAgentId(contract);
    if (!resolvedAgentId) return null;

    return {
        id: action.id,
        title: action.title,
        description: action.description,
        agentId: resolvedAgentId,
        priority: contract.priority,
        requiresFounderApproval: true,
        proposedAt: action.proposedAt,
        contract: { ...contract, agent_id: resolvedAgentId, approval_required: true },
    };
}

function findLatestPendingAction(messages: CommunicationMessage[]): LexProposedAction | null {
    const approvalIndex = messages.length - 1;
    if (messages[approvalIndex]?.direction !== "inbound") return null;

    for (let index = approvalIndex - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message.direction === "inbound") return null;
        const action = readProposedAction(message.metadata?.proposedAction);
        if (action) return action;
    }
    return null;
}

function hasCompletedAction(messages: CommunicationMessage[], actionId: string): boolean {
    return messages.some(message => message.direction === "outbound"
        && message.metadata?.actionExecution === "completed"
        && message.metadata?.actionId === actionId);
}

function renderActionResult(result: Awaited<ReturnType<typeof runAgent>>, guardBlockers: string[] = []): string {
    if (guardBlockers.length > 0) {
        return ["🛑 **I couldn’t execute that.**", "", ...guardBlockers.map(blocker => `• ${blocker}`), "", "Nothing was dispatched."].join("\n");
    }
    if (!result.success) {
        return ["⚠️ **I hit a blocker.**", "", result.summary, ...(result.blockers?.length ? ["", ...result.blockers.map(blocker => `• ${blocker}`)] : [])].join("\n");
    }
    if (result.executed && result.verified) {
        return ["✅ **Done.**", "", result.summary, ...(result.evidence ? ["", `Verified: ${result.evidence.reference}`] : [])].join("\n");
    }
    if (result.executed && !result.verified) {
        return ["⚠️ **Executed, but not verified.**", "", result.summary, "", "I won’t claim the action is complete until the result can be verified."].join("\n");
    }
    return ["⚠️ **No execution confirmed.**", "", result.summary].join("\n");
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
            if (!action) return this.sendResponse(message, "💬 **No pending action.**\n\nGive me a recommendation first, then approve that specific move.", "action_request_missing");
            if (hasCompletedAction(conversation.messages, action.id)) return this.sendResponse(message, "ℹ️ **Already done.**\n\nThat action has already been executed, so I won’t run it twice.", "action_already_completed");

            const guard = guardExecutiveDecision(`${action.title}\n${action.description}`);
            if (!guard.allowed) {
                return this.sendResponse(message, renderActionResult({
                    success: false,
                    summary: "The executive capability guard stopped this action before dispatch.",
                    completedAt: new Date().toISOString(),
                    executionStatus: "blocked",
                    executed: false,
                    verified: false,
                    blockers: guard.blockers,
                }, guard.blockers), "action_blocked", {
                    actionId: action.id,
                    actionExecution: "blocked",
                    blockers: guard.blockers,
                    actionContract: action.contract,
                });
            }

            const result = await runAgent(action.agentId, {
                id: action.id,
                title: action.title,
                description: action.description,
                priority: action.priority,
                metadata: {
                    operation: action.contract.operation,
                    target: action.contract.target,
                    priority: action.contract.priority,
                    approvalRequired: action.contract.approval_required,
                    controlledTest: action.description.includes("CONTROLLED_TEST_EMAIL=true"),
                },
            });

            return this.sendResponse(message, renderActionResult(result), "action_executed", {
                actionId: action.id,
                actionExecution: result.success && result.executed && result.verified ? "completed" : "failed",
                actionAgentId: action.agentId,
                actionStatus: result.executionStatus ?? (result.success ? "completed" : "failed"),
                actionVerified: result.verified ?? false,
                actionContract: action.contract,
                actionReceipt: {
                    success: result.success,
                    summary: result.summary,
                    executionStatus: result.executionStatus ?? (result.success ? "completed" : "failed"),
                    executed: result.executed ?? false,
                    verified: result.verified ?? false,
                    evidence: result.evidence ?? null,
                    verificationNotes: result.verificationNotes ?? [],
                    blockers: result.blockers ?? [],
                    completedAt: result.completedAt,
                },
            });
        }

        const casualReply = simpleCasualReply(message.content);
        if (casualReply) return this.sendResponse(message, casualReply, "casual");

        const controlledTestProposal = isControlledTestEmailRequest(message.content)
            ? buildControlledTestProposal()
            : null;
        if (controlledTestProposal) {
            const response = [
                "🎯 **Controlled test ready.**",
                "",
                `I’ve prepared the test email for **${process.env.LUUKU_TEST_CONTACT_EMAIL}** at **${process.env.LUUKU_TEST_CONTACT_COMPANY}**.`,
                "",
                "Nothing has been sent yet. I’ll only execute it after your approval.",
                "",
                "Say `Do it` when you’re ready.",
            ].join("\n");
            return this.sendResponse(message, response, "recommendation", { proposedAction: controlledTestProposal });
        }

        const context = await buildExecutiveContext();
        const structured = await requestAIStructured<LexStructuredResponse>({
            prompt: [
                "You are LEX, the executive principal of Luuku AI.",
                "You are speaking directly with the founder through the company's internal Discord channel.",
                "Communicate like a sharp, warm, capable executive partner, not a reporting dashboard.",
                "Use only facts supported by the company snapshot and conversation context. Do not invent metrics, completed work, agents, or capabilities.",
                "Never execute, dispatch, assign, or imply approval merely because you generated a recommendation. A recommendation is only a proposal.",
                "Never claim an external email, call, meeting, or other communication happened unless the execution result is explicitly supplied.",
                "Only propose operational actions when the founder asks what we should do, asks for a recommendation/next steps, or explicitly asks you to take or assign an action.",
                "Founder approval is required before execution.",
                "Every executable recommendation MUST include action_contract.enabled=true, approval_required=true, a registered agent id, a concrete operation, a concrete target, and a priority.",
                "Supported operations are: crm.prioritize_overdue, crm.follow_up, crm.update, email.send, research.enrich, and agent.execute. Never invent an operation.",
                "For overdue CRM backlog prioritization, use operation crm.prioritize_overdue and target 'overdue CRM activities'. This operation prioritizes work but does NOT complete it or reduce the overdue count.",
                "For an action that would contact an external person, the target must be an explicitly identified CRM recipient and execution remains subject to the capability guard.",
                "For non-action responses, set action_contract.enabled=false, approval_required=false, agent_id='', operation='', target='', and priority='low'.",
                "Choose one response type: company_update, analysis, recommendation, decision, question, casual.",
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
        if ((structured.type === "recommendation" || structured.type === "decision")
            && structured.action_contract.enabled
            && structured.action_contract.approval_required
            && !proposedAction) {
            const safeResponse: LexStructuredResponse = {
                ...structured,
                action_contract: {
                    ...structured.action_contract,
                    enabled: false,
                    approval_required: false,
                },
            };
            return this.sendResponse(message, renderLexDiscordMessages(safeResponse), structured.type);
        }

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

            const execution = await communicationRouter.execute({
                capability: "discord.send",
                channel: "discord",
                target: "founder",
                body: content,
                metadata: partMetadata,
            });

            if (!execution.executed || !execution.verified) {
                throw new Error(`LEX Discord response part ${index + 1} was not verified: ${execution.summary}`);
            }

            await prismaCommunicationService.sendMessage({
                conversationId: message.conversationId,
                channel: "discord",
                recipient: { channel: "discord", displayName: "Founder" },
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

export const founderLexOperatingResponder = new FounderLexOperatingResponder();
