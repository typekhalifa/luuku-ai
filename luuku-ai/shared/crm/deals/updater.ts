import { Deal } from "./types";

import { getDeals } from "./repository";

export function updateDeal(

    deal: Deal

): void {

    const deals = getDeals();

    const index = deals.findIndex(

        item =>

            item.id === deal.id

    );

    if (index >= 0) {

        deals[index] = deal;

        return;

    }

    deals.push(deal);

}