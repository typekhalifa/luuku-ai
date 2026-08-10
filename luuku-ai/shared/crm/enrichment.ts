import { Contact } from "./types";

import { crmApplication } from "../application";
import { researchProspect } from "./web-research";

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
    request: EnrichmentRequest,
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
    console.log("Research Agent is searching real sources...");

    const research = await researchProspect(
        request.company,
        request.reasons,
    );

    const sourceSummary = research.sources
        .map((source) => `${source.title}: ${source.url}`)
        .join(" | ");

    const result = await crmApplication.registerProspect({
        company: {
            name: research.company.name,
            industry: research.company.industry,
            website: research.company.website,
            country: research.company.country,
            city: research.company.city,
            size: research.company.size,
            status: "prospect",
            confidence: research.company.confidence,
            verified: true,
            source: sourceSummary,
        },
        contact: {
            name: research.contact.name,
            email: research.contact.email,
            phoneNumber: research.contact.phoneNumber,
            preferredLanguage: research.contact.preferredLanguage,
            department: research.contact.department,
            position: research.contact.position,
            verified: research.contact.confidence >= 80,
            confidence: research.contact.confidence,
            source: research.contact.source,
            lastVerifiedAt: new Date().toISOString(),
        },
    });

    console.log("");
    console.log("========================================");
    console.log("      APPLICATION");
    console.log("========================================");
    console.log("");
    console.log("✓ Prospect registered from real research.");
    console.log("");
    console.log("Workflow :", result.workflowId);
    console.log("Duration :", `${result.durationMs} ms`);
    console.log("");
    console.log("Research summary:");
    console.log(research.summary);
    console.log("");
    console.log("Sources:");

    for (const source of research.sources) {
        console.log(`• ${source.title} — ${source.url}`);
    }

    console.log("");
    console.log(result.company);
    console.log(result.contact);

    return {
        success: result.success,
        summary: research.summary,
        contact: {
            id: result.contact.id,
            name: result.contact.name,
            company: result.company.name,
            phoneNumber: result.contact.phoneNumber,
            email: result.contact.email,
            preferredLanguage:
                result.contact.preferredLanguage ?? "English",
            department: result.contact.department,
            position: result.contact.position,
            verified: result.contact.verified,
            confidence: result.contact.confidence,
            source: result.contact.source,
            lastVerifiedAt: result.contact.lastVerifiedAt,
        },
    };
}
