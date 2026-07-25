export interface CRMOverview {
    companies: number;
    contacts: number;
    deals: number;
    activities: number;
}

export class CRMApplication {

    async getOverview(): Promise<CRMOverview> {

        return {

            companies: 5,

            contacts: 17,

            deals: 8,

            activities: 42,

        };

    }

}

export const crmApplication =
    new CRMApplication();