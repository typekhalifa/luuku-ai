import type { CapabilityResolution } from "../planning/capability-resolver.js";

export type ResourceCapacityStatus = "AVAILABLE" | "AT_CAPACITY" | "UNKNOWN_AGENT";

export interface AgentCapacityRecord {
    readonly agentId: string;
    readonly maxConcurrent: number;
    readonly activeExecutions: number;
    readonly queuedExecutions?: number;
}

export interface ResourceCapacityAssessment {
    readonly agentId: string;
    readonly capability: string;
    readonly status: ResourceCapacityStatus;
    readonly maxConcurrent: number;
    readonly activeExecutions: number;
    readonly queuedExecutions: number;
    readonly availableSlots: number;
    readonly reason: string;
}

/**
 * Pure capacity boundary. It determines whether a resolved agent can accept
 * more work, without creating queue items or executing anything.
 */
export class ExecutiveResourceCapacityEngine {
    constructor(private readonly capacities: readonly AgentCapacityRecord[]) {
        const seen = new Set<string>();
        for (const record of capacities) {
            if (seen.has(record.agentId)) throw new Error(`Duplicate capacity record: ${record.agentId}`);
            seen.add(record.agentId);
            if (!Number.isInteger(record.maxConcurrent) || record.maxConcurrent < 1) {
                throw new Error(`maxConcurrent must be a positive integer for ${record.agentId}.`);
            }
            if (!Number.isInteger(record.activeExecutions) || record.activeExecutions < 0) {
                throw new Error(`activeExecutions must be a non-negative integer for ${record.agentId}.`);
            }
            if (record.queuedExecutions !== undefined && (!Number.isInteger(record.queuedExecutions) || record.queuedExecutions < 0)) {
                throw new Error(`queuedExecutions must be a non-negative integer for ${record.agentId}.`);
            }
        }
    }

    assess(resolution: CapabilityResolution): ResourceCapacityAssessment {
        const record = this.capacities.find((candidate) => candidate.agentId === resolution.agentId);
        if (!record) {
            return {
                agentId: resolution.agentId,
                capability: resolution.capability,
                status: "UNKNOWN_AGENT",
                maxConcurrent: 0,
                activeExecutions: 0,
                queuedExecutions: 0,
                availableSlots: 0,
                reason: `No capacity record exists for agent ${resolution.agentId}.`,
            };
        }

        const queuedExecutions = record.queuedExecutions ?? 0;
        const availableSlots = Math.max(record.maxConcurrent - record.activeExecutions, 0);
        const status = availableSlots > 0 ? "AVAILABLE" : "AT_CAPACITY";

        return {
            agentId: record.agentId,
            capability: resolution.capability,
            status,
            maxConcurrent: record.maxConcurrent,
            activeExecutions: record.activeExecutions,
            queuedExecutions,
            availableSlots,
            reason: status === "AVAILABLE"
                ? `Agent ${record.agentId} has ${availableSlots} available execution slot(s).`
                : `Agent ${record.agentId} is at capacity with ${record.activeExecutions}/${record.maxConcurrent} active executions.`,
        };
    }
}
