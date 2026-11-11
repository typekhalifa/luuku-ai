import type { Prisma } from "@prisma/client";
import { prisma } from "../client";
import type { ProspectPipelineStatus, ResearchedProspect } from "../../domain/prospect";

export interface PersistResearchedProspectInput {
    tenantCompanyId: string;
    researchTaskId: string;
    workflowId?: string;
    business: string;
    industry: string;
    website?: string;
    country: string;
    city?: string;
    size?: string;
    fitScore: number;
    recommendedOffer: string;
    owner: string;
    researchEvidence: Prisma.InputJsonValue;
    qualification: Prisma.InputJsonValue;
}

function toDomain(record: {
    id: string;
    tenantCompanyId: string;
    researchTaskId: string;
    workflowId: string | null;
    business: string;
    industry: string;
    website: string | null;
    country: string;
    city: string | null;
    size: string | null;
    fitScore: number;
    recommendedOffer: string;
    owner: string;
    status: string;
    archived: boolean;
    researchEvidence: Prisma.JsonValue;
    qualification: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
}): ResearchedProspect {
    return {
        ...record,
        workflowId: record.workflowId ?? undefined,
        website: record.website ?? undefined,
        city: record.city ?? undefined,
        size: record.size ?? undefined,
        status: record.status as ProspectPipelineStatus,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export class ResearchedProspectService {
    async persist(input: PersistResearchedProspectInput): Promise<ResearchedProspect> {
        if (!input.tenantCompanyId.trim()) throw new Error("PROSPECT_TENANT_REQUIRED");
        if (!input.researchTaskId.trim()) throw new Error("PROSPECT_RESEARCH_TASK_REQUIRED");
        if (!input.business.trim()) throw new Error("PROSPECT_BUSINESS_REQUIRED");

        const record = await prisma.prospect.upsert({
            where: {
                tenantCompanyId_researchTaskId: {
                    tenantCompanyId: input.tenantCompanyId,
                    researchTaskId: input.researchTaskId,
                },
            },
            create: {
                ...input,
                id: `${input.tenantCompanyId}:${input.researchTaskId}`,
            },
            update: {
                workflowId: input.workflowId,
                business: input.business,
                industry: input.industry,
                website: input.website,
                country: input.country,
                city: input.city,
                size: input.size,
                fitScore: input.fitScore,
                recommendedOffer: input.recommendedOffer,
                owner: input.owner,
                researchEvidence: input.researchEvidence,
                qualification: input.qualification,
            },
        });

        return toDomain(record);
    }

    async getByResearchTask(
        tenantCompanyId: string,
        researchTaskId: string,
    ): Promise<ResearchedProspect | null> {
        const record = await prisma.prospect.findUnique({
            where: {
                tenantCompanyId_researchTaskId: { tenantCompanyId, researchTaskId },
            },
        });
        return record ? toDomain(record) : null;
    }

    async findByBusiness(
        business: string,
        tenantCompanyId: string,
    ): Promise<ResearchedProspect | null> {
        const record = await prisma.prospect.findFirst({
            where: {
                tenantCompanyId,
                business: { equals: business.trim(), mode: "insensitive" },
                archived: false,
            },
            orderBy: { updatedAt: "desc" },
        });
        return record ? toDomain(record) : null;
    }

    async getById(id: string, tenantCompanyId: string): Promise<ResearchedProspect | null> {
        const record = await prisma.prospect.findFirst({
            where: { id, tenantCompanyId },
        });
        return record ? toDomain(record) : null;
    }

    async updateStatus(
        id: string,
        tenantCompanyId: string,
        status: ProspectPipelineStatus,
    ): Promise<ResearchedProspect> {
        const owned = await prisma.prospect.findFirst({
            where: { id, tenantCompanyId },
            select: { id: true },
        });
        if (!owned) throw new Error("PROSPECT_NOT_FOUND_OR_UNAUTHORIZED");

        const record = await prisma.prospect.update({
            where: { id },
            data: { status },
        });
        return toDomain(record);
    }
}

export const researchedProspectService = new ResearchedProspectService();
