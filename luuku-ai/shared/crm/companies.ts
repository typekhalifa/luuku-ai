import { Company } from "./company-types";

const companies: Company[] = [];

export function getCompanies(): Company[] {

    return companies;

}

export function saveCompany(

    company: Company

): void {

    companies.push(

        company

    );

}