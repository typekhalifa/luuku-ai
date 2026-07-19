import { api } from "@/services/api";

import type { DashboardStats } from "../types/dashboard";

export async function getDashboardStats(): Promise<DashboardStats> {
  return api<DashboardStats>("/dashboard");
}