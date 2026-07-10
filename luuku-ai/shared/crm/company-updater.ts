import { Company } from "./company-types";

import {

    getCompanies

} from "./companies";

export function updateCompany(

    company: Company

): void {

    const companies =

        getCompanies();

    const index = companies.findIndex(

        item =>

            item.id === company.id

    );

    if (index >= 0) {

        companies[index] = company;

        return;

    }

    companies.push(company);

}