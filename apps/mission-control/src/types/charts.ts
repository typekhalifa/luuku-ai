export interface ChartPoint {

  label: string;

  value: number;

}

export interface TimeSeriesPoint {

  date: string;

  value: number;

}

export interface RevenuePoint {

  month: string;

  revenue: number;

}

export interface AgentActivityPoint {

  time: string;

  active: number;

}

export interface MemoryPoint {

  time: string;

  memory: number;

}

export interface WorkflowPoint {

  day: string;

  workflows: number;

}

export interface LatencyPoint {

  time: string;

  latency: number;

}

export interface TokenUsagePoint {

  day: string;

  tokens: number;

}