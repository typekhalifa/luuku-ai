import crypto from "node:crypto";

import { buildExecutiveCRM } from "../executive/crm";
import { saveCompany } from "../crm/companies";
import { saveCRMContact } from "../crm/repository";
import { Company } from "../crm/company-types";
import { Contact } from "../crm/types";

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
    company: Company;
    contact: Contact;
}

export class CRMApplication {
    async getOverview(): Promise<CRMOverview> {
        const overview = buildExecutiveCRM();

        return {
            companies: overview.companies,
            contacts: overview.contacts,
            deals: overview.deals,
            activities: overview.activities,
        };
    }

    async registerProspect(
        request: RegisterProspectRequest,
    ): Promise<RegisterProspectResult> {
        const startedAt = Date.now();
        const company: Company = {
            id: crypto.randomUUID(),
            name: request.company.name,
            industry: request.company.industry,
            website: request.company.website,
            country: request.company.country,
            city: request.company.city,
            size: request.company.size as Company["size"],
            status: request.company.status as Company["status"],
            confidence: request.company.confidence,
            verified: request.company.verified,
            source: request.company.source,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const contact: Contact = {
            id: crypto.randomUUID(),
            name: request.contact.name,
            company: request.company.name,
            email: request.contact.email,
            phoneNumber: request.contact.phoneNumber,
            preferredLanguage: request.contact.preferredLanguage ?? "English",
            department: request.contact.department,
            position: request.contact.position,
            verified: request.contact.verified,
            confidence: request.contact.confidence,
            source: request.contact.source,
            lastVerifiedAt: request.contact.lastVerifiedAt,
        };

        saveCompany(company);
        saveCRMContact(contact);

        return {
            success: true,
            message: "Prospect registered successfully.",
            workflowId: crypto.randomUUID(),
            durationMs: Date.now() - startedAt,
            company,
            contact,
        };
    }
}

export const crmApplication = new CRMApplication();
