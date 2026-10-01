import { api } from "@/services/api";
import type { ObservabilityDashboard, ObservabilityTrace } from "../types/observability";

export async function getObservabilityDashboard(): Promise<ObservabilityDashboard> {
  return api<ObservabilityDashboard>("/observability/dashboard");
}

export async function getExecutionTrace(executionId: string): Promise<ObservabilityTrace> {
  return api<ObservabilityTrace>(
    `/observability/executions/${encodeURIComponent(executionId)}/trace`,
  );
}
