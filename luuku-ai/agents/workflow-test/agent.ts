import crypto from "node:crypto";

import { crmApplication } from "../../shared/application/crm.application";
import { prisma } from "../../shared/database/client";

import { registerEventHandlers } from "../../shared/events/register";

import { printEventHistory } from "../../shared/events/history/history-viewer";

import { workflowInspector } from "../../shared/events/history/workflow-inspector";

async function main() {
    const companyId = crypto.randomUUID();

    console.clear();

    console.log("");
    console.log("======================================");
    console.log(" AUTONOMOUS WORKFLOW TEST");
    console.log("======================================");
    console.log("");

    registerEventHandlers();

    await prisma.company.create({
        data: {
            id: companyId,
            name: `Workflow Test ${companyId.slice(0, 8)}`,
            industry: "Artificial Intelligence",
            country: "Rwanda",
            city: "Kigali",
            size: "startup",
            status: "prospect",
            confidence: 100,
            verified: true,
            source: "Workflow Test",
            updatedAt: new Date(),
        },
    });

    const result =
        await crmApplication.registerProspect({

            company: {

                name: "Luuku Technologies",

                industry: "Artificial Intelligence",

                website: "https://luuku.ai",

                country: "Rwanda",

                city: "Kigali",

                size: "startup",

                status: "prospect",

                confidence: 100,

                verified: true,

                source: "Workflow Test"

            },

            contact: {

                name: "Jean D'Amour",

                email: "hello@luuku.ai",

                phoneNumber: "+250788000000",

                preferredLanguage: "English",

                department: "Executive",

                position: "Founder",

                verified: true,

                confidence: 100,

                source: "Workflow Test",

                lastVerifiedAt:
                    new Date().toISOString()

            }

        }, {
            companyId,
            authMethod: "api-key",
            role: "SERVICE",
        });

    console.log(result);

    printEventHistory();

    workflowInspector.printTimeline();

    await prisma.company.delete({ where: { id: companyId } });
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });