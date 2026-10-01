import crypto from "crypto";

import { companyService } from "../../shared/database/services/company.service";
import { activityService } from "../../shared/database/services/activity.service";

async function main() {

    console.clear();

    console.log("");
    console.log("=======================================");
    console.log("      ACTIVITY SMOKE TEST");
    console.log("=======================================");
    console.log("");

    const company =
        await companyService.findCompanySystem(

            "Luuku AI"

        );

    if (!company) {

        throw new Error(

            "Company not found."

        );

    }

    const activity =
        await activityService.createActivitySystem({

            id:
                crypto.randomUUID(),

            companyId:
                company.id,

            contactId:
                undefined,

            dealId:
                undefined,

            type:
                "meeting",

            title:
                "Architecture Review",

            description:
                "Reviewed autonomous CRM architecture.",

            outcome:
                "Approved",

            createdBy:
                "executive-ai",

            completed:
                true,

            createdAt:
                new Date().toISOString()

        });

    console.log("✓ Activity Created");
    console.log(activity);

    console.log("");

    const activities =
        await activityService.getCompanyActivitiesSystem(

            company.id

        );

    console.table(

        activities.map(

            item => ({

                type:
                    item.type,

                title:
                    item.title,

                completed:
                    item.completed,

                createdBy:
                    item.createdBy

            })

        )

    );

    console.log("");

    console.log("✓ Activity Smoke Test Complete");

}

main().catch(console.error);