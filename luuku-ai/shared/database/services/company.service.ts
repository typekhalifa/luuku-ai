import { Company } from "../../domain/company";

import { companyRepository } from "../repositories/company.repository";

export class CompanyService {

    async getCompanies(): Promise<Company[]> {

        return companyRepository.findAll();

    }

    async getCompany(

        id: string

    ): Promise<Company | null> {

        return companyRepository.findById(id);

    }

    async findCompany(

        name: string

    ): Promise<Company | null> {

        return companyRepository.findByName(name);

    }

    async createCompany(

        company: Company

    ): Promise<Company> {

        return companyRepository.create(company);

    }

    async updateCompany(

        company: Company

    ): Promise<Company> {

        return companyRepository.update(company);

    }

    async deleteCompany(

        id: string

    ): Promise<void> {

        await companyRepository.delete(id);

    }

}

export const companyService =
    new CompanyService();