import { Deal } from "./types";

import { getDeals } from "./repository";

export function resolveDeal(

    id: string

): Deal | undefined {

    return getDeals().find(

        deal =>

            deal.id === id

    );

}

export function resolveCompanyDeals(

    companyId: string

): Deal[] {

    return getDeals().filter(

        deal =>

            deal.companyId === companyId

    );

}