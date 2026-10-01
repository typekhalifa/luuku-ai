import { companyService } from "../database/services/company.service";
import { contactService } from "../database/services/contact.service";
import { dealService } from "../database/services/deal.service";
import { activityService } from "../database/services/activity.service";

export interface ExecutiveCRM {
    companies: number;
    contacts: number;
    deals: number;
    activities: number;
    timeline: number;
}

export async function buildExecutiveCRM(): Promise<ExecutiveCRM> {
    const [companies, contacts, deals, activities] = await Promise.all([
        companyService.getCompaniesSystem(),
        contactService.getContactsSystem(),
        dealService.getDealsSystem(),
        activityService.getActivitiesSystem(),
    ]);

    return {
        companies: companies.length,
        contacts: contacts.length,
        deals: deals.length,
        activities: activities.length,
        timeline: activities.length,
    };
}
