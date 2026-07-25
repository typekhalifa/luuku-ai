import { api } from "../client/api";
import type { DashboardOverview } from "../types/dashboard";

export class DashboardClient {
  async getOverview(): Promise<DashboardOverview> {
    return api.get<DashboardOverview>("/dashboard");
  }
}

export const dashboardClient = new DashboardClient();