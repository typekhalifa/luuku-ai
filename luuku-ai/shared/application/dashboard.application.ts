import { companyService } from "../database/services/company.service";
import { eventHistory } from "../events/history/event-history";

export class DashboardApplication {
    async getOverview() {
        const companies = await companyService.getCompanies();
        const events = eventHistory.getAll();

        return {
            companies: companies.length,
            agents: 3, // temporary
            workflows: events.length,
            events: events.length,
        };
    }
}

export const dashboardApplication = new DashboardApplication();