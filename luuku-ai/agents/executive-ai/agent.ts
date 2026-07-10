import { bootstrap } from "../../shared/kernel/bootstrap";

import { requestExecutiveReasoning } from "../../shared/ai/executive";

import { runExecutiveReview } from "../../shared/executive/review";

import { parseDecision } from "./parser";

import { validateDecision } from "./decision";

import crypto from "crypto";

import { runAgent } from "../../shared/agents/runner";

import { saveExecutiveDecision } from "../../shared/executive/history";

import { buildFounderNotifications } from "../../shared/executive/notifications";

import { notifyFounder } from "../../shared/executive/notify";

import { renderExecutiveSummary } from "../../shared/executive/summary";

async function runExecutiveAI() {

    await bootstrap();

    try {

        console.log("");

        console.log("========================================");

        console.log("      LUUKU AI EXECUTIVE");

        console.log("========================================");

        const context =
            runExecutiveReview();

        console.log("");

        console.log("Requesting executive reasoning...");

        const response =
            await requestExecutiveReasoning(context);

        const decision =
            parseDecision(response);

        if (!validateDecision(decision)) {

            throw new Error(
                "Executive decision failed validation."
            );

        }

        saveExecutiveDecision(decision);

        const notifications =
            buildFounderNotifications(decision);

        notifyFounder(notifications);

        console.log("");

        console.log("========================================");

        console.log("      EXECUTIVE DECISION");

        console.log("========================================");

        console.log("");

        console.log(decision);

        const result = await runAgent(

            decision.assignedAgentId,

            {

                id: crypto.randomUUID(),

                title: decision.task.title,

                description: decision.task.description,

                priority: decision.task.priority

            }

        );

        console.log("");

        console.log("========================================");

        console.log("      AGENT RESULT");

        console.log("========================================");

        console.log("");

        console.log(result);

        renderExecutiveSummary();

    } catch (error) {

        console.error("");

        console.error("========================================");

        console.error("      EXECUTIVE AI FAILED");

        console.error("========================================");

        console.error("");

        console.error(error);

    }

}

runExecutiveAI();