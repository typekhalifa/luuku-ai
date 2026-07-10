import { Contact } from "./types";

import { updateCRMContact } from "./updater";

import {

    findCRMCompany,

    saveCRMCompany

} from "./company-repository";


import { getCompanies } from "./companies";
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

    console.log("Research Agent is enriching CRM...");

    const existingCompany =

        findCRMCompany(

            request.company

        );

    if (!existingCompany) {

        saveCRMCompany({

            id:

                crypto.randomUUID(),

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

                "Research Simulation",

            createdAt:

                new Date().toISOString(),

            updatedAt:

                new Date().toISOString()

        });

        console.log("");

        console.log("COMPANIES AFTER SAVE");

        console.log(getCompanies());

    }

    const contact: Contact = {

        id:

            crypto.randomUUID(),

        name:

            "Procurement Manager",

        company:

            request.company,

        phoneNumber:

            "+250780000000",

        email:

            "procurement@example.com",

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

    };

    const update =

        updateCRMContact(

            contact

        );

    console.log("");

    console.log("✓ CRM updated.");

    console.log(update.summary);

    return {

        success: true,

        summary:

            update.summary,

        contact:

            update.contact

    };

}