import type { ProspectMemory } from "../types/memory";
import { loadProspectMemory } from "../services/sales-memory";
import { updateProspectStatus } from "../../agents/sales-agent/pipeline";
import { researchedProspectService } from "../database/services/researched-prospect.service";
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

    async getTenantProspect(business: string, tenantCompanyId: string): Promise<ProspectMemory> {
        const normalizedBusiness = business.trim();
        if (!normalizedBusiness) throw new Error("BUSINESS_NAME_REQUIRED");

        const prospect = await researchedProspectService.findByBusiness(
            normalizedBusiness,
            tenantCompanyId,
        );
        if (!prospect) {
            throw new Error(`PROSPECT_NOT_FOUND: ${normalizedBusiness}`);
        }

        return {
            id: prospect.id,
            business: prospect.business,
            sector: prospect.industry,
            region: [prospect.city, prospect.country].filter(Boolean).join(", "),
            fitScore: prospect.fitScore,
            recommendedOffer: prospect.recommendedOffer,
            owner: prospect.owner,
            status: prospect.status,
            archived: prospect.archived,
            createdAt: prospect.createdAt,
            updatedAt: prospect.updatedAt,
        };
    }

    async prepareTenantOutreach(
        business: string,
        tenantCompanyId: string,
    ): Promise<PreparedSalesOutreach> {
        const prospect = await this.getTenantProspect(business, tenantCompanyId);
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

    async updateTenantPipelineStatus(
        business: string,
        tenantCompanyId: string,
        status: ProspectMemory["status"],
    ): Promise<ProspectMemory> {
        const prospect = await this.getTenantProspect(business, tenantCompanyId);
        const updated = await researchedProspectService.updateStatus(
            prospect.id,
            tenantCompanyId,
            status,
        );
        return {
            ...prospect,
            status: updated.status,
            updatedAt: updated.updatedAt,
        };
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
