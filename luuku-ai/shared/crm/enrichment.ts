import { Contact } from "./types";

import { crmApplication } from "../application";

export interface EnrichmentRequest {

    company: string;

    reasons: string[];

}

export interface EnrichmentResult {

    success: boolean;

    summary: string;

    contact: Contact;

}

export async function requestContactEnrichment(

    request: EnrichmentRequest

): Promise<EnrichmentResult> {

    console.log("");

    console.log("========================================");

    console.log("      RESEARCH ENRICHMENT");

    console.log("========================================");

    console.log("");

    console.log(`Company : ${request.company}`);

    console.log("");

    console.log("Reasons:");

    for (const reason of request.reasons) {

        console.log(`• ${reason}`);

    }

    console.log("");

    console.log("Research Agent is registering prospect...");

    const result =
        await crmApplication.registerProspect(

            {

                name:
                    request.company,

                industry:
                    "Unknown",

                website:
                    undefined,

                country:
                    "Rwanda",

                city:
                    undefined,

                size:
                    undefined,

                status:
                    "prospect",

                confidence:
                    95,

                verified:
                    true,

                source:
                    "Research Simulation"

            },

            {

                name:
                    "Procurement Manager",

                email:
                    "procurement@example.com",

                phoneNumber:
                    "+250780000000",

                preferredLanguage:
                    "English",

                department:
                    "Procurement",

                position:
                    "Manager",

                verified:
                    true,

                confidence:
                    95,

                source:
                    "Research Simulation",

                lastVerifiedAt:
                    new Date().toISOString()

            }

        );

    console.log("");

    console.log("========================================");

    console.log("      APPLICATION");

    console.log("========================================");

    console.log("");

    console.log("✓ Prospect registered.");

    console.log(result.company);

    console.log(result.contact);

    return {

        success: true,

        summary:
            "Prospect registered successfully.",

        contact: {

            id:
                result.contact!.id,

            name:
                result.contact!.name,

            company:
                result.company.name,

            phoneNumber:
                result.contact!.phoneNumber,

            email:
                result.contact!.email,

            preferredLanguage:
                result.contact!.preferredLanguage ??
                "English",

            department:
                result.contact!.department,

            position:
                result.contact!.position,

            verified:
                result.contact!.verified,

            confidence:
                result.contact!.confidence,

            source:
                result.contact!.source,

            lastVerifiedAt:
                result.contact!.lastVerifiedAt

        }

    };

}