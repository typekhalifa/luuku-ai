import { bootstrap } from "../../shared/kernel/bootstrap";
import { requestExecutiveReasoning } from "../../shared/ai/executive";
import { runExecutiveReview } from "../../shared/executive/review";
import { parseDecision } from "./parser";
import { validateDecision } from "./decision";
import { guardExecutiveDecision } from "../../shared/executive/decision-guard";
import crypto from "crypto";
import { runAgent } from "../../shared/agents/runner";
import { AgentResult } from "../../shared/agents/interface";
import { saveExecutiveDecision } from "../../shared/executive/history";
import { buildFounderNotifications } from "../../shared/executive/notifications";
import { notifyFounder } from "../../shared/executive/notify";
import { createFounderDiscordCommunication } from "../../shared/executive/founder-discord";

const MAX_RECOVERY_ATTEMPTS = 2;

type ExecutiveDecision = ReturnType<typeof parseDecision>;

async function publishFounderNotifications(
    decision: ExecutiveDecision,
    blockers: string[] = [],
) {
    const notifications = buildFounderNotifications(decision);

    if (blockers.length > 0 && notifications.length > 0) {
        notifications[0].title = "Executive Decision — BLOCKED";
        notifications[0].message += `\n\n⚠️ Execution was blocked before agent dispatch:\n${blockers.map((blocker) => `• ${blocker}`).join("\n")}`;
    }

    notifyFounder(notifications);

    if (notifications.length > 0) {
        const founderCommunication = createFounderDiscordCommunication();
        await founderCommunication.publishNotifications(notifications);
        console.log("");
        console.log("✓ Executive notifications delivered to Discord.");
    }
}

function buildBlockedResult(blockers: string[]): AgentResult {
    return {
        success: false,
        summary: "Executive task blocked before agent execution because required capabilities or scheduling constraints are not currently executable.",
        completedAt: new Date().toISOString(),
        executionStatus: "blocked",
        executed: false,
        verified: false,
        blockers,
    };
}

async function executeDecisionWithRecovery(
    initialDecision: ExecutiveDecision,
): Promise<{ decision: ExecutiveDecision; result: AgentResult }> {
    let decision = initialDecision;
    let recoveryAttempts = 0;

    while (true) {
        const decisionGuard = guardExecutiveDecision(
            `${decision.summary}\n${decision.task.title}\n${decision.task.description}`,
        );

        saveExecutiveDecision(decision);

        console.log("");
        console.log("========================================");
        console.log(
            recoveryAttempts === 0
                ? "      FOUNDER NOTIFICATIONS"
                : "   RECOVERY NOTIFICATIONS",
        );
        console.log("========================================");
        console.log("");
        await publishFounderNotifications(decision, decisionGuard.blockers);

        console.log("");
        console.log("========================================");
        console.log(
            recoveryAttempts === 0
                ? "      EXECUTIVE DECISION"
                : "   RECOVERED EXECUTIVE DECISION",
        );
        console.log("========================================");
        console.log("");
        console.log(decision);

        if (decisionGuard.allowed) {
            console.log("");
            console.log("✓ Decision guard passed. Dispatching agent...");

            const result = await runAgent(
                decision.assignedAgentId,
                {
                    id: crypto.randomUUID(),
                    title: decision.task.title,
                    description: decision.task.description,
                    priority: decision.task.priority,
                },
            );

            return { decision, result };
        }

        console.log("");
        console.log("========================================");
        console.log("      EXECUTION BLOCKED");
        console.log("========================================");
        console.log("");
        console.log("The Executive decision requires capabilities or timing that are not currently executable.");
        for (const blocker of decisionGuard.blockers) {
            console.log(`- ${blocker}`);
        }

        if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
            console.log("");
            console.log(`⚠ Maximum recovery attempts reached (${MAX_RECOVERY_ATTEMPTS}). Escalating without dispatch.`);
            return {
                decision,
                result: buildBlockedResult(decisionGuard.blockers),
            };
        }

        recoveryAttempts += 1;

        console.log("");
        console.log("========================================");
        console.log(`   EXECUTIVE RECOVERY ${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS}`);
        console.log("========================================");
        console.log("");
        console.log("Re-entering executive reasoning with the deterministic blockers above.");

        const blockedResult = buildBlockedResult(decisionGuard.blockers);
        const recoveryContext = await runExecutiveReview(blockedResult);
        const recoveryResponse = await requestExecutiveReasoning(recoveryContext);
        const recoveryDecision = parseDecision(recoveryResponse);

        if (!validateDecision(recoveryDecision)) {
            throw new Error("Executive recovery decision failed validation.");
        }

        decision = recoveryDecision;
    }
}

async function runExecutiveAI() {
    await bootstrap();

    try {
        console.log("");
        console.log("========================================");
        console.log("      LUUKU AI EXECUTIVE");
        console.log("========================================");

        const context = await runExecutiveReview();

        console.log("");
        console.log("Requesting executive reasoning...");

        const response = await requestExecutiveReasoning(context);
        const decision = parseDecision(response);

        if (!validateDecision(decision)) {
            throw new Error("Executive decision failed validation.");
        }

        const { decision: executedDecision, result } =
            await executeDecisionWithRecovery(decision);

        console.log("");
        console.log("========================================");
        console.log("      AGENT RESULT");
        console.log("========================================");
        console.log("");
        console.log(result);

        console.log("");
        console.log("========================================");
        console.log("   POST-EXECUTION EXECUTIVE REVIEW");
        console.log("========================================");
        console.log("");

        const finalContext = await runExecutiveReview(result);
        const followUpResponse = await requestExecutiveReasoning(finalContext);
        const followUpDecision = parseDecision(followUpResponse);

        if (!validateDecision(followUpDecision)) {
            throw new Error("Post-execution executive decision failed validation.");
        }

        const followUpGuard = guardExecutiveDecision(
            `${followUpDecision.summary}\n${followUpDecision.task.title}\n${followUpDecision.task.description}`,
        );

        saveExecutiveDecision(followUpDecision);

        console.log("");
        console.log("========================================");
        console.log("   POST-EXECUTION EXECUTIVE DECISION");
        console.log("========================================");
        console.log("");
        console.log(followUpDecision);

        if (!followUpGuard.allowed) {
            console.log("");
            console.log("========================================");
            console.log(" POST-EXECUTION DECISION BLOCKED");
            console.log("========================================");
            for (const blocker of followUpGuard.blockers) {
                console.log(`- ${blocker}`);
            }
        }

        await publishFounderNotifications(followUpDecision, followUpGuard.blockers);

        console.log("");
        console.log("========================================");
        console.log("      EXECUTIVE SUMMARY");
        console.log("========================================");
        console.log("");
        console.log("CRM");
        console.log("");
        console.log(`Companies   : ${finalContext.crm.companies}`);
        console.log(`Contacts    : ${finalContext.crm.contacts}`);
        console.log(`Deals       : ${finalContext.crm.deals}`);
        console.log(`Activities  : ${finalContext.crm.activities}`);
        console.log(`Timeline    : ${finalContext.crm.timeline}`);

        console.log("");
        console.log(`✓ Executive cycle completed for: ${executedDecision.task.title}`);

    } catch (error) {
        console.error(error);
    }
}

runExecutiveAI();
