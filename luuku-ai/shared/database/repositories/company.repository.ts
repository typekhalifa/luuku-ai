import { prisma } from "../client";

import { Company } from "../../domain/company";
import { CompanyMapper } from "../mappers/company.mapper";
import { BaseRepository } from "./base.repository";

export class CompanyRepository extends BaseRepository<Company> {
    async findAll(companyId?: string): Promise<Company[]> {
        const companies = await prisma.company.findMany({
            where: companyId ? { id: companyId } : undefined,
            orderBy: { createdAt: "asc" }
        });

        return companies.map(CompanyMapper.toDomain);
    }

    async findById(id: string, companyId?: string): Promise<Company | null> {
        if (companyId && id !== companyId) return null;

        const company = await prisma.company.findUnique({ where: { id } });
        if (!company) return null;
        return CompanyMapper.toDomain(company);
    }

    async findByName(name: string, companyId?: string): Promise<Company | null> {
        const company = await prisma.company.findFirst({
            where: {
                name: { contains: name, mode: "insensitive" },
                ...(companyId ? { id: companyId } : {})
            }
        });

        if (!company) return null;
        return CompanyMapper.toDomain(company);
    }

    async create(company: Company): Promise<Company> {
        const created = await prisma.company.create({
            data: CompanyMapper.toPersistence(company)
        });
        return CompanyMapper.toDomain(created);
    }

    async update(company: Company, companyId?: string): Promise<Company> {
        if (companyId) {
            if (company.id !== companyId) {
                throw new Error("COMPANY_NOT_FOUND_OR_UNAUTHORIZED");
            }
        }

        const updated = await prisma.company.update({
            where: { id: company.id },
            data: CompanyMapper.toPersistence(company)
        });
        return CompanyMapper.toDomain(updated);
    }

    async delete(id: string, companyId?: string): Promise<void> {
        if (companyId) {
            if (id !== companyId) {
                throw new Error("COMPANY_NOT_FOUND_OR_UNAUTHORIZED");
            }
        }

        await prisma.company.delete({ where: { id } });
    }
}

export const companyRepository = new CompanyRepository();
