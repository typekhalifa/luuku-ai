import { companyService } from "../database/services/company.service";
import { eventHistory } from "../events/history/event-history";
import { communicationObservability } from "../communication";
import type { ApiRequestContext } from "../api/request-context";

export class DashboardApplication {
    async getOverview(context: ApiRequestContext) {
        const [companies, communication] = await Promise.all([
            companyService.getCompanies(context.companyId),
            communicationObservability.getSnapshot(10),
        ]);
        const events = eventHistory.getAll();

        return {
            companies: companies.length,
            agents: 3,
            workflows: events.length,
            events: events.length,
            communication,
        };
    }
}

export const dashboardApplication = new DashboardApplication();
