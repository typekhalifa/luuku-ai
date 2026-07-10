import { Company } from "./company-types";

import {

    getCompanies

} from "./companies";

export function resolveCompany(

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