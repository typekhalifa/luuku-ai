import crypto from "crypto";

import { requestAI } from "../ai/client";
import { buildExecutiveContext } from "../../agents/executive-ai/brain";
import { parseDecision } from "../../agents/executive-ai/parser";
import { validateDecision, ExecutiveDecision } from "../../agents/executive-ai/decision";
import { guardExecutiveDecision } from "./decision-guard";
import { saveExecutiveDecision } from "./history";
import { runAgent } from "../agents/runner";
import { AgentResult } from "../agents/interface";
import { buildExecutiveCapabilities } from "./capabilities";

interface FounderCommandPlan {
    mode: "answer" | "execute";
    response: string;
    decision: ExecutiveDecision | null;
}

export interface FounderCommandInput {
    message: string;
    recentConversation: string;
}

export interface FounderCommandResult {
    response: string;
    executed: boolean;
    decision?: ExecutiveDecision;
    result?: AgentResult;
}

function looksLikeExplicitFounderCommand(message: string): boolean {
    const normalized = message.trim().replace(/^lex[,\s:]*/i, "");

    return /^(ask|tell|have|assign|delegate|instruct|run|execute|research|analyze|check|review|create|draft|find|contact|call|schedule|send|follow\s+up|update|prepare|audit|enrich)\b/i.test(
        normalized,
    ) || /\b(ask|assign|delegate|instruct)\s+(the\s+)?(sales|research|voice)\s+agent\b/i.test(normalized);
}

function parseFounderCommandPlan(text: string): FounderCommandPlan {
    try {
        const parsed = JSON.parse(text) as FounderCommandPlan;

        if (
            (parsed.mode !== "answer" && parsed.mode !== "execute") ||
            typeof parsed.response !== "string"
        ) {
            throw new Error("Invalid founder command plan.");
        }

        if (parsed.mode === "execute") {
            if (!parsed.decision) {
                throw new Error("Executable founder command is missing a decision.");
            }

            if (!validateDecision(parsed.decision)) {
                throw new Error("Executable founder command contains an invalid decision.");
            }
        }

        return parsed;
    } catch (error) {
        if (error instanceof Error && error.message !== "Invalid founder command plan.") {
            throw error;
        }

        throw new Error("Failed to parse founder command plan.");
    }
}

function formatExecutionResult(
    decision: ExecutiveDecision,
    result: AgentResult,
): string {
    const status = result.executionStatus ?? (result.success ? "completed" : "failed");
    const evidenceLines = result.evidence
        ? [
              "",
              "Execution evidence:",
              `Provider: ${result.evidence.provider ?? "internal"}`,
              `Reference: ${result.evidence.reference ?? result.evidence.externalId ?? "none"}`,
          ]
        : [];

    const verificationLines = result.verificationNotes?.length
        ? ["", "Verification:", ...result.verificationNotes.map((note) => `- ${note}`)]
        : [];

    const blockerLines = result.blockers?.length
        ? ["", "Blockers:", ...result.blockers.map((blocker) => `- ${blocker}`)]
        : [];

    return [
        `Founder command executed through ${decision.assignedAgentId} Agent.`,
        "",
        `Task: ${decision.task.title}`,
        `Status: ${status}`,
        `Executed: ${result.executed === true ? "yes" : "no"}`,
        `Verified: ${result.verified === true ? "yes" : "no"}`,
        ...evidenceLines,
        ...verificationLines,
        ...blockerLines,
        "",
        result.summary,
    ].join("\n");
}

export async function executeFounderCommand(
    input: FounderCommandInput,
): Promise<FounderCommandResult> {
    const context = await buildExecutiveContext();
    const capabilities = buildExecutiveCapabilities();
    const explicitCommand = looksLikeExplicitFounderCommand(input.message);

    const planningPrompt = `
You are Lex, the Executive AI of Luuku AI.

The founder is communicating directly with you through the company's executive Discord channel.

Your job is to determine whether the founder's latest message is:
1. an informational question that should be answered from authoritative runtime context, or
2. an explicit operational command that should be delegated to an available agent.

CRITICAL FOUNDER-INTENT RULE
- The LATEST FOUNDER MESSAGE is authoritative for the founder's current intent.
- RECENT PERSISTENT FOUNDER CONVERSATION is context only. It must never override or cancel an explicit command in the latest message.
- If the latest message explicitly asks Lex to ask, assign, delegate, instruct, run, execute, research, analyze, check, review, create, draft, find, contact, call, schedule, send, follow up, update, prepare, audit, or enrich something, treat it as a NEW EXECUTION REQUEST even if the same or a similar task appears in recent conversation as already completed.
- A prior completion may be mentioned after execution, but it is never a reason to convert the new command into an informational answer.
- When the latest message is an explicit command, mode MUST be "execute" unless the command is impossible to map to any registered agent. If impossible, explain the blocker rather than pretending it was completed.
- The application has also classified the latest message as an explicit command: ${explicitCommand ? "true" : "false"}.
- When that application classification is true, do not choose mode="answer" merely because recent conversation says the task was completed.

IMPORTANT EXECUTION RULES
- Never invent business facts.
- Use the executive context below as runtime truth.
- Never claim an external action happened unless the returned agent result provides execution evidence.
- Never turn "completed" into "verified". Verification requires domain-specific evidence.
- Capabilities are hard constraints.
- "available" means executable now.
- "simulation_only" means the action may be simulated but must never be presented as externally completed.
- "unavailable" means the action cannot be executed.
- Prefer the smallest useful task that directly satisfies the founder's command.
- Use lowercase agent IDs.
- Current registered execution agents are: sales, research, voice.
- If the founder asks for a consequential external action that is currently unavailable, create a decision that explains the blocker and chooses a useful blocker-resolving task instead when appropriate.
- If the founder only asks a question, do not create an executable task.

AUTHORITATIVE EXECUTIVE CONTEXT
${JSON.stringify(context, null, 2)}

CURRENT CAPABILITIES
${JSON.stringify(capabilities, null, 2)}

RECENT PERSISTENT FOUNDER CONVERSATION
${input.recentConversation}

LATEST FOUNDER MESSAGE
${input.message}

Return JSON only. No markdown.

Schema:
{
  "mode": "answer | execute",
  "response": "short direct response to the founder",
  "decision": null
}

For mode="execute", decision must be:
{
  "summary": "string",
  "priority": "high | medium | low",
  "reasoning": "string",
  "assignedAgentId": "sales | research | voice",
  "confidence": 0.95,
  "task": {
    "title": "string",
    "description": "string",
    "priority": "high | medium | low"
  }
}
`;

    const planningResponse = await requestAI({
        prompt: planningPrompt,
        temperature: 0.1,
    });

    let plan = parseFounderCommandPlan(planningResponse);

    if (explicitCommand && plan.mode === "answer") {
        const correctionResponse = await requestAI({
            prompt: `${planningPrompt}\n\nHARD OVERRIDE: The application classifier detected an explicit founder command. Your previous plan incorrectly chose answer mode. Re-plan the LATEST FOUNDER MESSAGE as an execution request. Return mode="execute" with a valid decision assigned to the appropriate registered agent. Do not use prior conversation history as a reason to answer instead of execute.`,
            temperature: 0.0,
        });

        plan = parseFounderCommandPlan(correctionResponse);

        if (plan.mode === "answer" || !plan.decision) {
            throw new Error(
                "Founder command planner failed to produce an executable decision for an explicit founder command.",
            );
        }
    }

    if (plan.mode === "answer" || !plan.decision) {
        return {
            response: plan.response,
            executed: false,
        };
    }

    const decision = parseDecision(JSON.stringify(plan.decision));
    const guard = guardExecutiveDecision(
        `${decision.summary}\n${decision.task.title}\n${decision.task.description}`,
    );

    saveExecutiveDecision(decision);

    if (!guard.allowed) {
        return {
            response: [
                "Founder command received, but execution is blocked.",
                "",
                `Planned task: ${decision.task.title}`,
                "",
                ...guard.blockers.map((blocker) => `⚠️ ${blocker}`),
                "",
                "I have not claimed the action was executed.",
            ].join("\n"),
            executed: false,
            decision,
        };
    }

    try {
        const result = await runAgent(decision.assignedAgentId, {
            id: crypto.randomUUID(),
            title: decision.task.title,
            description: decision.task.description,
            priority: decision.task.priority,
        });

        return {
            response: formatExecutionResult(decision, result),
            executed: result.executed === true,
            decision,
            result,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown agent execution error.";
        const failedResult: AgentResult = {
            success: false,
            summary: `Agent execution failed: ${message}`,
            completedAt: new Date().toISOString(),
            executionStatus: "failed",
            executed: false,
            verified: false,
            blockers: [message],
            verificationNotes: [
                "No successful agent execution evidence was produced.",
            ],
        };

        return {
            response: formatExecutionResult(decision, failedResult),
            executed: false,
            decision,
            result: failedResult,
        };
    }
}
