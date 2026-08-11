import crypto from "crypto";

import {
    ExecutionStatus
} from "../../execution/types";

import {
    dealService
} from "../../database/services/deal.service";

export async function updateDealsAfterCall(

    companyId: string,

    summary: string,

    executionStatus: ExecutionStatus

): Promise<void> {

    const isRealExecution =
        executionStatus === "completed" ||
        executionStatus === "verified";

    if (!isRealExecution) {

        console.log("");

        console.log("========================================");

        console.log("        DEAL STATE UNCHANGED");

        console.log("========================================");

        console.log("");

        console.log(
            `Reason : Voice execution status is ${executionStatus}.`
        );

        console.log(
            "No deal stage mutation was applied to CRM reality."
        );

        return;

    }

    const deals =
        await dealService.getCompanyDeals(
            companyId
        );

    if (deals.length === 0) {

        const stage =
            determineStage(
                summary
            );

        await dealService.createDeal({

            id:
                crypto.randomUUID(),

            companyId,

            title:
                "AI Discovery Opportunity",

            value:
                5000,

            currency:
                "USD",

            stage,

            probability:
                stage === "lead"
                    ? 20
                    : stage === "qualified"
                    ? 40
                    : stage === "discovery"
                    ? 60
                    : stage === "proposal"
                    ? 80
                    : 50,

            ownerAgentId:
                "sales",

            nextAction:
                "Follow up after voice call.",

            createdAt:
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString()

        });

        console.log("");

        console.log("========================================");

        console.log("        DEAL CREATED");

        console.log("========================================");

        console.log("");

        console.log(
            `Company : ${companyId}`
        );

        console.log(
            `Stage   : ${stage}`
        );

        return;

    }

    const deal =
        deals[0];

    deal.stage =
        determineStage(
            summary
        );

    deal.updatedAt =
        new Date().toISOString();

    await dealService.updateDeal(
        deal
    );

    console.log("");

    console.log("========================================");

    console.log("        DEAL UPDATED");

    console.log("========================================");

    console.log("");

    console.log(
        `Company : ${companyId}`
    );

    console.log(
        `Stage   : ${deal.stage}`
    );

}

function determineStage(

    summary: string

) {

    const text =
        summary.toLowerCase();

    if (
        text.includes("proposal")
    ) {
        return "proposal" as const;
    }

    if (
        text.includes("meeting") ||
        text.includes("demo") ||
        text.includes("discovery")
    ) {
        return "discovery" as const;
    }

    if (
        text.includes("qualified")
    ) {
        return "qualified" as const;
    }

    return "lead" as const;

}