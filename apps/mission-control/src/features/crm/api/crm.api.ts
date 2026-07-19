import { api } from "@/services/api";

import type { Company } from "../types/company";

export async function getCompanies(): Promise<Company[]> {
  return api<Company[]>("/companies");
}