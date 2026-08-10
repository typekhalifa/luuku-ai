import { Deal } from "./types";
import { loadCollection, saveCollection } from "../persistent-store";

let deals: Deal[] = loadCollection<Deal>("deals");

export function getDeals(): Deal[] {
    deals = loadCollection<Deal>("deals");
    return deals;
}

export function saveDeal(deal: Deal): void {
    deals = [...getDeals(), deal];
    saveCollection("deals", deals);
}
