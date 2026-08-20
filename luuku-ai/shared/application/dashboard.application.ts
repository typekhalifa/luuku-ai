import { companyService } from "../database/services/company.service";
import { eventHistory } from "../events/history/event-history";
import { communicationObservability } from "../communication";

export class DashboardApplication {
    async getOverview() {
        const [companies, communication] = await Promise.all([
            companyService.getCompanies(),
            communicationObservability.getSnapshot(10),
        ]);
        const events = eventHistory.getAll();

        return {
            companies: companies.length,
            agents: 3, // temporary
            workflows: events.length,
            events: events.length,
            communication,
        };
    }
}

export const dashboardApplication = new DashboardApplication();
