import { companyService } from "../database/services/company.service";
import type { ApiRequestContext } from "../api/request-context";

export class DashboardApplication {
    async getOverview(context: ApiRequestContext) {
        const companies = await companyService.getCompanies(context.companyId);

        // Global communication/event stores are not durably tenant-scoped yet.
        // Fail closed rather than exposing another tenant's telemetry.
        return {
            companies: companies.length,
            agents: 3,
            workflows: 0,
            events: 0,
            communication: null,
            tenantScopeStatus: "CRM_SCOPED_COMMUNICATION_TELEMETRY_PENDING",
        };
    }
}

export const dashboardApplication = new DashboardApplication();
