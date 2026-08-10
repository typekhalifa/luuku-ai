import { companyService } from "../database/services/company.service";
import { contactService } from "../database/services/contact.service";
import { dealService } from "../database/services/deal.service";
import { activityService } from "../database/services/activity.service";
import { registerProspectWorkflow } from "./workflows/register-prospect.workflow";

export interface CRMOverview {
    companies: number;
    contacts: number;
    deals: number;
    activities: number;
}

export interface RegisterProspectRequest {
    company: {
        name: string;
        industry: string;
        website?: string;
        country: string;
        city?: string;
        size?: string;
        status: string;
        confidence: number;
        verified: boolean;
        source: string;
    };
    contact: {
        name: string;
        email?: string;
        phoneNumber?: string;
        preferredLanguage?: string;
        department?: string;
        position?: string;
        verified: boolean;
        confidence: number;
        source: string;
        lastVerifiedAt: string;
    };
}

export interface RegisterProspectResult {
    success: boolean;
    message: string;
    workflowId: string;
    durationMs: number;
    company: {
        id: string;
        name: string;
        industry: string;
        website?: string;
        country: string;
        city?: string;
        size?: string;
        status: string;
        confidence: number;
        verified: boolean;
        source: string;
    };
    contact: {
        id: string;
        name: string;
        company: string;
        email?: string;
        phoneNumber?: string;
        preferredLanguage?: string;
        department?: string;
        position?: string;
        verified: boolean;
        confidence: number;
        source: string;
        lastVerifiedAt?: string;
    };
}

export class CRMApplication {
    async getOverview(): Promise<CRMOverview> {
        const [companies, contacts, deals, activities] = await Promise.all([
            companyService.getCompanies(),
            contactService.getContacts(),
            dealService.getDeals(),
            activityService.getActivities(),
        ]);

        return {
            companies: companies.length,
            contacts: contacts.length,
            deals: deals.length,
            activities: activities.length,
        };
    }

    async registerProspect(
        request: RegisterProspectRequest,
    ): Promise<RegisterProspectResult> {
        const result = await registerProspectWorkflow.execute({
            company: {
                name: request.company.name,
                industry: request.company.industry,
                website: request.company.website,
                country: request.company.country,
                city: request.company.city,
                size: request.company.size as "startup" | "small" | "medium" | "enterprise" | undefined,
                status: request.company.status as "prospect" | "qualified" | "customer" | "inactive",
                confidence: request.company.confidence,
                verified: request.company.verified,
                source: request.company.source,
            },
            contact: {
                name: request.contact.name,
                email: request.contact.email,
                phoneNumber: request.contact.phoneNumber,
                preferredLanguage: request.contact.preferredLanguage,
                department: request.contact.department,
                position: request.contact.position,
                verified: request.contact.verified,
                confidence: request.contact.confidence,
                source: request.contact.source,
                lastVerifiedAt: request.contact.lastVerifiedAt,
            },
        });

        return {
            success: result.success,
            message: result.message,
            workflowId: result.workflowId,
            durationMs: result.durationMs,
            company: result.company,
            contact: {
                id: result.contact.id,
                name: result.contact.name,
                company: result.company.name,
                email: result.contact.email,
                phoneNumber: result.contact.phoneNumber,
                preferredLanguage: result.contact.preferredLanguage,
                department: result.contact.department,
                position: result.contact.position,
                verified: result.contact.verified,
                confidence: result.contact.confidence,
                source: result.contact.source,
                lastVerifiedAt: result.contact.lastVerifiedAt,
            },
        };
    }
}

export const crmApplication = new CRMApplication();
