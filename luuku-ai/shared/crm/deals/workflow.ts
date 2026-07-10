import crypto from "crypto";

import { resolveCompanyDeals } from "./resolver";

import { updateDeal } from "./updater";

import { saveDeal } from "./repository";

export function updateDealsAfterCall(

    companyId: string,

    summary: string

): void {

    const deals =

        resolveCompanyDeals(

            companyId

        );

    if (deals.length === 0) {

        const stage =

            determineStage(

                summary

            );

        saveDeal({

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

    updateDeal(

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

        text.includes(

            "proposal"

        )

    ) {

        return "proposal";

    }

    if (

        text.includes(

            "meeting"

        ) ||

        text.includes(

            "demo"

        ) ||

        text.includes(

            "discovery"

        )

    ) {

        return "discovery";

    }

    if (

        text.includes(

            "qualified"

        )

    ) {

        return "qualified";

    }

    return "lead";

}