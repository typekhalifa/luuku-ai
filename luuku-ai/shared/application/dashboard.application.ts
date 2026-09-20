import { companyService } from "../database/services/company.service";
import type { ApiRequestContext } from "../api/request-context";
import { communicationObservability } from "../communication";

export class DashboardApplication {
    async getOverview(context: ApiRequestContext) {
        const [companies, communication] = await Promise.all([
            companyService.getCompanies(context.companyId),
            communicationObservability.getSnapshot(10, context.companyId),
        ]);

        // Communication telemetry currently fails closed to an empty tenant-scoped snapshot.
        return {
            companies: companies.length,
            agents: 3,
            workflows: 0,
            events: 0,
            communication,
        };
    }
}

export const dashboardApplication = new DashboardApplication();
