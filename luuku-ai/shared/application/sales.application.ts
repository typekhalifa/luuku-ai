import type { ProspectMemory } from "../types/memory";
import { loadProspectMemory } from "../services/sales-memory";
import { updateProspectStatus } from "../../agents/sales-agent/pipeline";
import {
    generateCallScript,
    generateColdEmail,
    generateLinkedIn,
    generateWhatsApp,
} from "../../agents/sales-agent/outreach";

export type SalesOutreachChannel =
    | "email"
    | "linkedin"
    | "whatsapp"
    | "call";

export interface PreparedSalesOutreach {
    prospectId: string;
    business: string;
    status: ProspectMemory["status"];
    fitScore: number;
    recommendedOffer: string;
    messages: Record<SalesOutreachChannel, string>;
    dispatch: {
        executed: false;
        reason: string;
    };
}

/**
 * Application boundary for sales work.
 *
 * This service prepares sales material and manages the existing prospect
 * pipeline. It deliberately does not send messages or invoke providers:
 * outbound communication must be submitted as a governed V6 workflow.
 */
export class SalesApplication {
    getProspect(business: string): ProspectMemory {
        const normalizedBusiness = business.trim();

        if (!normalizedBusiness) {
            throw new Error("BUSINESS_NAME_REQUIRED");
        }

        const prospect = loadProspectMemory(normalizedBusiness);

        if (!prospect) {
            throw new Error(`PROSPECT_NOT_FOUND: ${normalizedBusiness}`);
        }

        return prospect;
    }

    prepareOutreach(business: string): PreparedSalesOutreach {
        const prospect = this.getProspect(business);

        return {
            prospectId: prospect.id,
            business: prospect.business,
            status: prospect.status,
            fitScore: prospect.fitScore,
            recommendedOffer: prospect.recommendedOffer,
            messages: {
                email: generateColdEmail(prospect),
                linkedin: generateLinkedIn(prospect),
                whatsapp: generateWhatsApp(prospect),
                call: generateCallScript(prospect),
            },
            dispatch: {
                executed: false,
                reason: "Prepared only. Sending requires an approved V6 communication workflow.",
            },
        };
    }

    updatePipelineStatus(
        business: string,
        status: ProspectMemory["status"],
    ): ProspectMemory {
        // Resolve first so the application boundary returns a stable,
        // domain-specific not-found error before delegating persistence.
        this.getProspect(business);
        return updateProspectStatus(business.trim(), status);
    }
}

export const salesApplication = new SalesApplication();
