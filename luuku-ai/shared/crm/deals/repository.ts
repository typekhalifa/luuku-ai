import { Deal } from "./types";

const deals: Deal[] = [];

export function getDeals(): Deal[] {

    return deals;

}

export function saveDeal(

    deal: Deal

): void {

    deals.push(deal);

}