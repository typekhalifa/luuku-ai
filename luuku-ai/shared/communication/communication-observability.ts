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
    ): Promise<CommunicationObservabilitySnapshot> {
        const [
            messageTotal,
            inboundMessages,
            outboundMessages,
            conversationTotal,
            activeConversations,
            executionTotal,
            verifiedExecutions,
            failedExecutions,
            executionStatuses,
            executionPolicies,
            eventTotal,
            eventProviders,
            eventTypes,
            channelMessages,
            recentMessages,
            recentExecutions,
            recentEvents,
        ] = await Promise.all([
            prisma.communicationMessage.count(),
            prisma.communicationMessage.count({ where: { direction: "inbound" } }),
            prisma.communicationMessage.count({ where: { direction: "outbound" } }),
            prisma.communicationConversation.count(),
            prisma.communicationConversation.count({ where: { status: "active" } }),
            prisma.communicationExecution.count(),
            prisma.communicationExecution.count({ where: { verified: true } }),
            prisma.communicationExecution.count({ where: { status: "failed" } }),
            prisma.communicationExecution.groupBy({
                by: ["status"],
                _count: { _all: true },
            }),
            prisma.communicationExecution.groupBy({
                by: ["policyDecision"],
                _count: { _all: true },
            }),
            prisma.communicationEvent.count(),
            prisma.communicationEvent.groupBy({
                by: ["provider"],
                _count: { _all: true },
            }),
            prisma.communicationEvent.groupBy({
                by: ["type"],
                _count: { _all: true },
            }),
            prisma.communicationConversation.groupBy({
                by: ["channel"],
                _count: { _all: true },
            }),
            prisma.communicationMessage.findMany({
                orderBy: { timestamp: "desc" },
                take: recentLimit,
                select: {
                    id: true,
                    timestamp: true,
                    direction: true,
                    conversationId: true,
                    conversation: { select: { channel: true } },
                },
            }),
            prisma.communicationExecution.findMany({
                orderBy: { createdAt: "desc" },
                take: recentLimit,
                select: {
                    id: true,
                    createdAt: true,
                    status: true,
                    policyDecision: true,
                    verified: true,
                    channel: true,
                    provider: true,
                    taskId: true,
                    conversationId: true,
                },
            }),
            prisma.communicationEvent.findMany({
                orderBy: { receivedAt: "desc" },
                take: recentLimit,
                select: {
                    id: true,
                    receivedAt: true,
                    provider: true,
                    type: true,
                    conversationId: true,
                },
            }),
        ]);

        const timeline: CommunicationObservabilityTimelineEntry[] = [
            ...recentMessages.map((message) => ({
                source: "message" as const,
                id: message.id,
                timestamp: message.timestamp,
                channel: message.conversation.channel,
                direction: message.direction,
                conversationId: message.conversationId,
            })),
            ...recentExecutions.map((execution) => ({
                source: "execution" as const,
                id: execution.id,
                timestamp: execution.createdAt,
                channel: execution.channel,
                status: execution.status,
                provider: execution.provider ?? undefined,
                policyDecision: execution.policyDecision,
                verified: execution.verified,
                taskId: execution.taskId,
                conversationId: execution.conversationId,
            })),
            ...recentEvents.map((event) => ({
                source: "event" as const,
                id: event.id,
                timestamp: event.receivedAt,
                provider: event.provider,
                type: event.type,
                conversationId: event.conversationId,
            })),
        ]
            .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
            .slice(0, recentLimit);

        return {
            generatedAt: new Date(),
            messages: {
                total: messageTotal,
                inbound: inboundMessages,
                outbound: outboundMessages,
            },
            conversations: {
                total: conversationTotal,
                active: activeConversations,
            },
            executions: {
                total: executionTotal,
                verified: verifiedExecutions,
                failed: failedExecutions,
                byStatus: toCounts(
                    executionStatuses.map((row) => ({
                        value: row.status,
                        count: row._count._all,
                    })),
                ),
                byPolicyDecision: toCounts(
                    executionPolicies.map((row) => ({
                        value: row.policyDecision,
                        count: row._count._all,
                    })),
                ),
            },
            events: {
                total: eventTotal,
                byProvider: toCounts(
                    eventProviders.map((row) => ({
                        value: row.provider,
                        count: row._count._all,
                    })),
                ),
                byType: toCounts(
                    eventTypes.map((row) => ({
                        value: row.type,
                        count: row._count._all,
                    })),
                ),
            },
            channels: toCounts(
                channelMessages.map((row) => ({
                    value: row.channel,
                    count: row._count._all,
                })),
            ),
            timeline,
        };
    }
}

export const communicationObservability =
    new CommunicationObservabilityService();
