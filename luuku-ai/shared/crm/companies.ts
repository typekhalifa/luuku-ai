import { Company } from "./company-types";
import { loadCollection, saveCollection } from "./persistent-store";

let companies: Company[] = loadCollection<Company>("companies");

export function getCompanies(): Company[] {
    companies = loadCollection<Company>("companies");
    return companies;
}

export function saveCompany(company: Company): void {
    companies = [...getCompanies(), company];
    saveCollection("companies", companies);
}
