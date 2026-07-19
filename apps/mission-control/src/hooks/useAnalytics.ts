import { useQuery } from "@tanstack/react-query";

import * as analytics from "@/services/analytics.service";

export function useRevenue() {
  return useQuery({
    queryKey: ["revenue"],
    queryFn: analytics.getRevenue,
  });
}

export function useAgentActivity() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: analytics.getAgentActivity,
  });
}

export function useWorkflowStats() {
  return useQuery({
    queryKey: ["workflow-chart"],
    queryFn: analytics.getWorkflowStats,
  });
}

export function useMemoryUsage() {
  return useQuery({
    queryKey: ["memory"],
    queryFn: analytics.getMemoryUsage,
  });
}

export function useLatency() {
  return useQuery({
    queryKey: ["latency"],
    queryFn: analytics.getLatency,
  });
}

export function useTokenUsage() {
  return useQuery({
    queryKey: ["tokens"],
    queryFn: analytics.getTokenUsage,
  });
}