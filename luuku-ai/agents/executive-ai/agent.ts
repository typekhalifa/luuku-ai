import { requestExecutiveReasoning } from "../../shared/ai/executive";

import { runExecutiveReview } from "../../shared/executive/review";

import { parseDecision } from "./parser";

import { validateDecision } from "./decision";

import { delegateDecision } from "./delegate";

import { saveExecutiveDecision } from "../../shared/executive/history";

import { buildFounderNotifications } from "../../shared/executive/notifications";

import { notifyFounder } from "../../shared/executive/notify";

async function runExecutiveAI() {

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

        delegateDecision(decision);

        console.log("");

        console.log("Executive cycle completed successfully.");

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