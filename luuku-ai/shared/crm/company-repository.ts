import { Company } from "./company-types";

import {

    getCompanies,

    saveCompany

} from "./companies";

export function getCRMCompanies(): Company[] {

    return getCompanies();

}

export function findCRMCompany(

    name: string

): Company | undefined {

    return getCompanies().find(

        company =>

            company.name

                .toLowerCase()

                .includes(

                    name.toLowerCase()

                )

    );

}

export function saveCRMCompany(

    company: Company

): void {

    saveCompany(

        company

    );

}