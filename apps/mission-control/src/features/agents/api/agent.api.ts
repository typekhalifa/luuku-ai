import { api } from "@/services/api";

import type { Agent } from "../types/agent";

export async function getAgents(): Promise<Agent[]> {
  return api<Agent[]>("/agents");
}