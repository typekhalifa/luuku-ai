import { crmApplication } from "../../shared/application/crm.application";

async function main() {

    console.clear();

    console.log("");
    console.log("======================================");
    console.log(" AUTONOMOUS WORKFLOW TEST");
    console.log("======================================");
    console.log("");

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

        });

    console.log(result);

}

main().catch(console.error);