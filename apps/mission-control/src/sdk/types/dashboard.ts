export interface DashboardCommunicationObservability {
  messages: {
    total: number;
    inbound: number;
    outbound: number;
  };
  conversations: {
    total: number;
    active: number;
  };
  executions: {
    total: number;
    verified: number;
    failed: number;
    byStatus: Record<string, number>;
    byPolicyDecision: Record<string, number>;
  };
  events: {
    total: number;
    byProvider: Record<string, number>;
    byType: Record<string, number>;
  };
  channels: Record<string, number>;
  timeline: Array<{
    source: "message" | "execution" | "event";
    id: string;
    timestamp: string;
    channel?: string;
    status?: string;
    provider?: string;
    type?: string;
    direction?: string;
    policyDecision?: string;
    verified?: boolean;
    taskId?: string | null;
    conversationId?: string | null;
  }>;
}

export interface DashboardOverview {
  companies: number;
  agents: number;
  workflows: number;
  events: number;
  communication: DashboardCommunicationObservability;
}
