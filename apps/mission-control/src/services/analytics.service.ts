import type {
  RevenuePoint,
  AgentActivityPoint,
  WorkflowPoint,
  MemoryPoint,
  LatencyPoint,
  TokenUsagePoint,
} from "@/types/charts";

export async function getRevenue() {

  const data: RevenuePoint[] = [

    { month: "Jan", revenue: 12 },

    { month: "Feb", revenue: 19 },

    { month: "Mar", revenue: 28 },

    { month: "Apr", revenue: 34 },

    { month: "May", revenue: 41 },

    { month: "Jun", revenue: 53 },

  ];

  return Promise.resolve(data);

}

export async function getAgentActivity() {

  const data: AgentActivityPoint[] = [

    { time: "08", active: 2 },

    { time: "09", active: 4 },

    { time: "10", active: 5 },

    { time: "11", active: 3 },

    { time: "12", active: 6 },

    { time: "13", active: 7 },

  ];

  return Promise.resolve(data);

}

export async function getWorkflowStats() {

  const data: WorkflowPoint[] = [

    { day: "Mon", workflows: 5 },

    { day: "Tue", workflows: 7 },

    { day: "Wed", workflows: 8 },

    { day: "Thu", workflows: 6 },

    { day: "Fri", workflows: 10 },

  ];

  return Promise.resolve(data);

}

export async function getMemoryUsage() {

  const data: MemoryPoint[] = [

    { time: "08", memory: 2.1 },

    { time: "09", memory: 2.5 },

    { time: "10", memory: 2.7 },

    { time: "11", memory: 3.0 },

    { time: "12", memory: 2.8 },

  ];

  return Promise.resolve(data);

}

export async function getLatency() {

  const data: LatencyPoint[] = [

    { time: "08", latency: 41 },

    { time: "09", latency: 37 },

    { time: "10", latency: 52 },

    { time: "11", latency: 45 },

    { time: "12", latency: 39 },

  ];

  return Promise.resolve(data);

}

export async function getTokenUsage() {

  const data: TokenUsagePoint[] = [

    { day: "Mon", tokens: 180000 },

    { day: "Tue", tokens: 250000 },

    { day: "Wed", tokens: 320000 },

    { day: "Thu", tokens: 400000 },

    { day: "Fri", tokens: 520000 },

  ];

  return Promise.resolve(data);

}