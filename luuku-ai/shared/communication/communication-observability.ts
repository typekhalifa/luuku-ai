import { prisma } from "../database/client";

export interface CommunicationObservabilityTimelineEntry {
    source: "message" | "execution" | "event";
    id: string;
    timestamp: Date;
    channel?: string;
    status?: string;
    provider?: string;
    type?: string;
    direction?: string;
    policyDecision?: string;
    verified?: boolean;
    taskId?: string | null;
    conversationId?: string | null;
}

export interface CommunicationObservabilitySnapshot {
    generatedAt: Date;
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
    timeline: CommunicationObservabilityTimelineEntry[];
}

function toCounts<T extends string>(
    rows: Array<{ value: T; count: number }>,
): Record<string, number> {
    return Object.fromEntries(rows.map(({ value, count }) => [value, count]));
}

export class CommunicationObservabilityService {
    async getSnapshot(
        recentLimit = 20,
        companyId?: string,
    ): Promise<CommunicationObservabilitySnapshot> {
        if (!companyId) {
            throw new Error("TENANT_CONTEXT_REQUIRED_FOR_COMMUNICATION_OBSERVABILITY");
        }

        // Communication records predate durable tenant ownership. Returning
        // global telemetry here would cross the authenticated tenant boundary.
        // Until the communication schema carries companyId, fail closed with
        // an empty tenant-scoped snapshot rather than exposing global data.
        return {
            generatedAt: new Date(),
            messages: { total: 0, inbound: 0, outbound: 0 },
            conversations: { total: 0, active: 0 },
            executions: { total: 0, verified: 0, failed: 0, byStatus: {}, byPolicyDecision: {} },
            events: { total: 0, byProvider: {}, byType: {} },
            channels: {},
            timeline: [],
        };
    }
}

export const communicationObservability =
    new CommunicationObservabilityService();
