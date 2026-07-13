import { crmApplication } from "../../shared/application/crm.application";

import { eventBus } from "../../shared/events/core/event-bus";

import { consoleHandler } from "../../shared/events/handlers/console.handler";

import { ProspectRegisteredEvent } from "../../shared/events/events/prospect-registered.event";


async function main() {

    console.clear();

    console.log("");
    console.log("======================================");
    console.log(" AUTONOMOUS WORKFLOW TEST");
    console.log("======================================");
    console.log("");

    eventBus.subscribe(

        "ProspectRegistered",

        consoleHandler

    );

    eventBus.subscribe(

        ProspectRegisteredEvent.TYPE,

        consoleHandler

    );

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