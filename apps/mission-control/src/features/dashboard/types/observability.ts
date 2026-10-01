export interface ObservabilityAlert {
  id: string;
  severity: "WARN" | "ERROR";
  message: string;
  value: number;
  threshold: number;
}

export interface ObservabilityDashboard {
  companyId: string;
  from: string;
  to: string;
  requests: number;
  request4xx: number;
  request5xx: number;
  requestErrorRate: number;
  latency: {
    samples: number;
    averageMs: number;
    maxMs: number;
  };
  executions: {
    started: number;
    succeeded: number;
    failed: number;
  };
  providers: {
    succeeded: number;
    failed: number;
  };
  alerts: ObservabilityAlert[];
}

export interface ObservabilityTraceEvent {
  id: string;
  eventType: string;
  source: string;
  executionId?: string | null;
  workflowId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  severity: string;
  status?: string | null;
  actorType?: string | null;
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
}

export interface ObservabilityTrace {
  executionId: string;
  events: ObservabilityTraceEvent[];
}
