import { Company } from "../../domain/company";

import { companyRepository } from "../repositories/company.repository";

export class CompanyService {
    async getCompanies(companyId?: string): Promise<Company[]> {
        return companyRepository.findAll(companyId);
    }

    async getCompany(id: string, companyId?: string): Promise<Company | null> {
        return companyRepository.findById(id, companyId);
    }

    async findCompany(name: string, companyId?: string): Promise<Company | null> {
        return companyRepository.findByName(name, companyId);
    }

    async createCompany(company: Company, companyId?: string): Promise<Company> {
        if (companyId && company.id !== companyId) {
            throw new Error("COMPANY_TENANT_MISMATCH");
        }
        return companyRepository.create(company);
    }

    async updateCompany(company: Company, companyId?: string): Promise<Company> {
        return companyRepository.update(company, companyId);
    }

    async deleteCompany(id: string, companyId?: string): Promise<void> {
        await companyRepository.delete(id, companyId);
    }
}

export const companyService = new CompanyService();
