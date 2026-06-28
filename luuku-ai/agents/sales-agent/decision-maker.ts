import { loadIndustry } from "../../shared/services/knowledge";

export function findDecisionMakers(sector: string) {

    const industry = loadIndustry(sector);

    if (!industry?.decisionMakers) {
        return [];
    }

    return industry.decisionMakers.sort(
        (a: any, b: any) => b.priority - a.priority
    );

}