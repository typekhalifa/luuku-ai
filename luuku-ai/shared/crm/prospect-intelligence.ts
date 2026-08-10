import { ProspectResearchResult } from "./web-research";

export type ProspectReadiness = "READY" | "VALIDATE";

export interface ProspectIntelligence {
    score: {
        aiNeed: number;
        workflowPotential: number;
        knowledgeFit: number;
        outreachAttractiveness: number;
        overall: number;
    };
    confidence: "HIGH" | "MEDIUM" | "LOW";
    readiness: ProspectReadiness;
    tags: string[];
    opportunity: string;
    recommendedOffer: string;
    why: string;
    nextAction: string;
    contactQuality: "VERIFIED" | "PARTIAL" | "UNVERIFIED";
}

function clamp(value: number) {
    return Math.max(1, Math.min(10, Math.round(value * 10) / 10));
}

function hasAny(text: string, terms: string[]) {
    return terms.some((term) => text.includes(term));
}

export function assessProspect(result: ProspectResearchResult): ProspectIntelligence {
    const companyText = `${result.company.industry} ${result.summary}`.toLowerCase();
    const contact = result.contact;

    let aiNeed = 6;
    let workflowPotential = 6;
    let knowledgeFit = 6;
    let outreachAttractiveness = 5;
    const tags: string[] = [];

    if (hasAny(companyText, ["digital transformation", "digitalization", "digitalisation", "electronic", "technology", "it initiative", "modernization", "modernisation"])) {
        aiNeed += 1;
        workflowPotential += 1;
        tags.push("digital-transformation-signal");
    }

    if (hasAny(companyText, ["government", "revenue authority", "regulator", "bank", "finance", "insurance"])) {
        knowledgeFit += 1;
        workflowPotential += 0.5;
        tags.push("knowledge-heavy-operations");
    }

    if (hasAny(companyText, ["workflow", "process", "operations", "service", "customer", "support", "reporting", "tax", "customs"])) {
        workflowPotential += 1;
        tags.push("workflow-automation-fit");
    }

    if (contact.position || contact.department) {
        outreachAttractiveness += 1;
        tags.push("relevant-department-found");
    }

    if (contact.email) {
        outreachAttractiveness += 1;
        tags.push("verified-email-present");
    }

    if (contact.phoneNumber) {
        outreachAttractiveness += 0.5;
        tags.push("verified-phone-present");
    }

    if (result.company.confidence >= 90) tags.push("high-company-confidence");
    if (contact.confidence >= 85) tags.push("high-contact-confidence");

    aiNeed = clamp(aiNeed);
    workflowPotential = clamp(workflowPotential);
    knowledgeFit = clamp(knowledgeFit);
    outreachAttractiveness = clamp(outreachAttractiveness);

    const overall = clamp(
        aiNeed * 0.3 +
            workflowPotential * 0.3 +
            knowledgeFit * 0.2 +
            outreachAttractiveness * 0.2,
    );

    const contactQuality: ProspectIntelligence["contactQuality"] =
        contact.email && contact.phoneNumber
            ? "VERIFIED"
            : contact.email || contact.phoneNumber
                ? "PARTIAL"
                : "UNVERIFIED";

    const confidence: ProspectIntelligence["confidence"] =
        result.company.confidence >= 90 && contact.confidence >= 85
            ? "HIGH"
            : result.company.confidence >= 75 && contact.confidence >= 65
                ? "MEDIUM"
                : "LOW";

    const readiness: ProspectReadiness =
        overall >= 8 && contactQuality !== "UNVERIFIED" && confidence !== "LOW"
            ? "READY"
            : "VALIDATE";

    let opportunity = "Workflow and knowledge automation";
    let recommendedOffer = "AI Workflow & Knowledge Audit";

    if (hasAny(companyText, ["government", "revenue authority", "regulator"])) {
        opportunity = "Internal knowledge, service workflow, and digital-process automation";
        recommendedOffer = "AI Workflow Automation Audit + Internal Knowledge Assistant";
    } else if (hasAny(companyText, ["bank", "finance", "insurance"])) {
        opportunity = "Internal knowledge, support, compliance, and approval workflow automation";
        recommendedOffer = "AI Knowledge Assistant + Workflow Audit";
    } else if (hasAny(companyText, ["hotel", "hospitality", "tourism", "restaurant"])) {
        opportunity = "Guest support and operational coordination automation";
        recommendedOffer = "Guest Support + Operations Workflow Assistant";
    } else if (hasAny(companyText, ["health", "hospital", "clinic", "medical"])) {
        opportunity = "Administrative knowledge and non-clinical workflow automation";
        recommendedOffer = "Administrative Knowledge + Workflow Assistant";
    } else if (hasAny(companyText, ["education", "university", "school", "college"])) {
        opportunity = "Institutional knowledge and administrative support automation";
        recommendedOffer = "Institutional Knowledge Assistant";
    }

    const why = `The organization shows ${tags.includes("digital-transformation-signal") ? "a public digital-transformation signal" : "a plausible automation fit"}, while the research identifies ${contact.department || contact.position || "a relevant public contact"}.`;

    const nextAction = readiness === "READY"
        ? "Validate one concrete workflow or knowledge bottleneck, then prepare a founder-reviewed outreach brief."
        : "Run one focused validation pass to identify a concrete workflow bottleneck and confirm the best decision-maker before outreach.";

    return {
        score: { aiNeed, workflowPotential, knowledgeFit, outreachAttractiveness, overall },
        confidence,
        readiness,
        tags: Array.from(new Set(tags)),
        opportunity,
        recommendedOffer,
        why,
        nextAction,
        contactQuality,
    };
}
