import crypto from "crypto";

import { companyService } from "../../shared/database/services/company.service";
import { dealService } from "../../shared/database/services/deal.service";

async function main() {

    console.clear();

    console.log("");
    console.log("=======================================");
    console.log("        DEAL SMOKE TEST");
    console.log("=======================================");
    console.log("");

    const now =
        new Date().toISOString();

    let company =
        await companyService.findCompanySystem(
            "Luuku AI"
        );

    if (!company) {

        company =
            await companyService.createCompanySystem({

                id:
                    crypto.randomUUID(),

                name:
                    "Luuku AI",

                industry:
                    "Artificial Intelligence",

                website:
                    "https://luuku.ai",

                country:
                    "Rwanda",

                city:
                    "Kigali",

                size:
                    "startup",

                status:
                    "prospect",

                confidence:
                    100,

                verified:
                    true,

                source:
                    "Deal Smoke Test",

                createdAt:
                    now,

                updatedAt:
                    now

            });

        console.log("✓ Company created.");

    } else {

        console.log("✓ Company already exists.");

    }

    console.log("");

    const createdDeal =
        await dealService.createDealSystem({

            id:
                crypto.randomUUID(),

            companyId:
                company.id,

            title:
                "AI Infrastructure Consulting",

            value:
                15000,

            currency:
                "USD",

            stage:
                "lead",

            probability:
                25,

            ownerAgentId:
                "executive-ai",

            nextAction:
                "Schedule discovery meeting",

            dueDate:
                undefined,

            expectedCloseDate:
                undefined,

            lastActivityAt:
                undefined,

            createdAt:
                now,

            updatedAt:
                now

        });

    console.log("✓ Deal created.");
    console.log(createdDeal);

    console.log("");

    const deals =
        await dealService.getCompanyDealsSystem(

            company.id

        );

    console.log("Company Deals");

    console.table(

        deals.map(

            deal => ({

                title:
                    deal.title,

                stage:
                    deal.stage,

                value:
                    deal.value,

                probability:
                    deal.probability

            })

        )

    );

    console.log("");

    console.log("✓ Smoke Test Complete.");

}

main().catch(console.error);