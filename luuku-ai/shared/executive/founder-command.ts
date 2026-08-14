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

    const planningPrompt = `
You are Lex, the Executive AI of Luuku AI.

The founder is communicating directly with you through the company's executive Discord channel.

Your job is to determine whether the founder's latest message is:
1. an informational question that should be answered from authoritative runtime context, or
2. an explicit operational command that should be delegated to an available agent.

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

    const plan = parseFounderCommandPlan(planningResponse);

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
