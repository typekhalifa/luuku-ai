import { Company } from "../../domain/company";

import { companyRepository } from "../repositories/company.repository";

export class CompanyService {
    async getCompanies(companyId: string): Promise<Company[]> {
        return companyRepository.findAll(companyId);
    }

    async getCompaniesSystem(): Promise<Company[]> {
        return companyRepository.findAll();
    }

    async getCompany(id: string, companyId: string): Promise<Company | null> {
        return companyRepository.findById(id, companyId);
    }

    async getCompanySystem(id: string): Promise<Company | null> {
        return companyRepository.findById(id);
    }

    async findCompany(name: string, companyId: string): Promise<Company | null> {
        return companyRepository.findByName(name, companyId);
    }

    async findCompanySystem(name: string): Promise<Company | null> {
        return companyRepository.findByName(name);
    }

    async createCompany(company: Company, companyId: string): Promise<Company> {
        if (company.id !== companyId) {
            throw new Error("COMPANY_TENANT_MISMATCH");
        }
        return companyRepository.create(company, companyId);
    }

    async createCompanySystem(company: Company): Promise<Company> {
        return companyRepository.create(company);
    }

    async updateCompany(company: Company, companyId: string): Promise<Company> {
        return companyRepository.update(company, companyId);
    }

    async updateCompanySystem(company: Company): Promise<Company> {
        return companyRepository.update(company);
    }

    async deleteCompany(id: string, companyId: string): Promise<void> {
        await companyRepository.delete(id, companyId);
    }

    async deleteCompanySystem(id: string): Promise<void> {
        await companyRepository.delete(id);
    }
}

export const companyService = new CompanyService();
