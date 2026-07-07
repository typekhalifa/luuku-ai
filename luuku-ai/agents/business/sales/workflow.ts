import { AgentTask } from "../../../shared/agents/interface";

import { executeVoiceTask } from "../../communication/voice/execute";

import { resolveTaskContext } from "../../../shared/context/resolver";

import { resolveContact } from "../../../shared/crm/resolver";

import { validateContact } from "../../../shared/crm/validator";

import {

    requestContactEnrichment

} from "../../../shared/crm/enrichment";


export async function executeSalesWorkflow(

    task: AgentTask

): Promise<void> {

    console.log("");

    console.log("========================================");

    console.log("        SALES WORKFLOW");

    console.log("========================================");

    console.log("");

    const text = (

        task.title +

        " " +

        task.description

    ).toLowerCase();

    const context =

        resolveTaskContext(task);

    const contact =

        resolveContact(

            context.company

        );

    if (!contact) {

        console.log("");

        console.log("========================================");

        console.log("      CRM VALIDATION");

        console.log("========================================");

        console.log("");

        console.log("Status : FAILED");

        console.log("");

        console.log("Reason:");

        console.log("• No contact found.");

        console.log("");

        await requestContactEnrichment({

            company:

                context.company,

            reasons: [

                "No contact found."

            ]

        });

        return;

    }

    const validation =

        validateContact(contact);

    console.log("");

    console.log("========================================");

    console.log("      CRM VALIDATION");

    console.log("========================================");

    console.log("");

    if (!validation.ready) {

        console.log("Status : FAILED");

        console.log("");

        console.log("Reasons:");

        for (

            const reason of validation.reasons

        ) {

            console.log(

                `• ${reason}`

            );

        }

        console.log("");

        await requestContactEnrichment({

            company:

                context.company,

            reasons:

                validation.reasons

        });

        return;

    }

    console.log("Status : PASSED");

    console.log("");

    console.log("CRM ready for communication.");

    console.log("");

    const requiresVoice =

        text.includes("call") ||

        text.includes("phone") ||

        text.includes("meeting");

    if (requiresVoice) {

        console.log("✓ Communication required");

        console.log("");

        await executeVoiceTask(task);

    } else {

        console.log("✓ No communication required");

    }

}