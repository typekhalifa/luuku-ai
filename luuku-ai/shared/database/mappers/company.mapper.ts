import { Company } from "../../crm/company-types";
import { Company as PrismaCompany } from "@prisma/client";

export class CompanyMapper {

    static toDomain(

        company: PrismaCompany

    ): Company {

        return {

            id: company.id,

            name: company.name,

            industry: company.industry,

            website: company.website ?? undefined,

            country: company.country,

            city: company.city ?? undefined,

            size: company.size ?? undefined,

            status: company.status,

            confidence: company.confidence,

            verified: company.verified,

            source: company.source,

            createdAt:

                company.createdAt.toISOString(),

            updatedAt:

                company.updatedAt.toISOString()

        };

    }

    static toPersistence(

        company: Company

    ) {

        return {

            id: company.id,

            name: company.name,

            industry: company.industry,

            website: company.website,

            country: company.country,

            city: company.city,

            size: company.size,

            status: company.status,

            confidence: company.confidence,

            verified: company.verified,

            source: company.source,

            createdAt:

                new Date(company.createdAt),

            updatedAt:

                new Date(company.updatedAt)

        };

    }

}