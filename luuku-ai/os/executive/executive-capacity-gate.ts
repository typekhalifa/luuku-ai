import type { ExecutiveWorkCandidate } from "./executive-work-arbitrator.js";

export interface ExecutiveCapacityResource {
    readonly id: string;
    readonly limit: number;
    readonly inUse?: number;
}

export interface ExecutiveCapacityRequirement {
    readonly resourceId: string;
    readonly units?: number;
}

export interface ExecutiveCapacityDecision {
    readonly selected: readonly ExecutiveWorkCandidate[];
    readonly rejected: readonly ExecutiveWorkCandidate[];
    readonly capacity: Readonly<Record<string, { limit: number; initialInUse: number; reserved: number; remaining: number }>>;
    readonly evidence: Readonly<Record<string, unknown>>;
}

/**
 * Bounds already-arbitrated executive work against known resource capacity.
 * This gate only admits or rejects work; it never executes work or grants authority.
 */
export class ExecutiveCapacityGate {
    private readonly resources: Map<string, { limit: number; inUse: number }>;

    constructor(resources: readonly ExecutiveCapacityResource[]) {
        this.resources = new Map();
        for (const resource of resources) {
            if (!resource.id.trim()) throw new Error("Capacity resource id must be non-empty.");
            if (!Number.isInteger(resource.limit) || resource.limit < 1) {
                throw new Error(`Capacity limit for ${resource.id} must be a positive integer.`);
            }
            const inUse = resource.inUse ?? 0;
            if (!Number.isInteger(inUse) || inUse < 0 || inUse > resource.limit) {
                throw new Error(`Capacity inUse for ${resource.id} must be between 0 and its limit.`);
            }
            if (this.resources.has(resource.id)) throw new Error(`Duplicate capacity resource: ${resource.id}`);
            this.resources.set(resource.id, { limit: resource.limit, inUse });
        }
    }

    admit(
        candidates: readonly ExecutiveWorkCandidate[],
        requirements: (candidate: ExecutiveWorkCandidate) => readonly ExecutiveCapacityRequirement[],
    ): ExecutiveCapacityDecision {
        const usage = new Map<string, number>();
        const selected: ExecutiveWorkCandidate[] = [];
        const rejected: ExecutiveWorkCandidate[] = [];
        const rejectionReasons: Record<string, string> = {};

        for (const candidate of candidates) {
            const aggregated = new Map<string, number>();
            for (const requirement of requirements(candidate)) {
                if (!requirement.resourceId.trim()) throw new Error("Capacity requirement resource id must be non-empty.");
                const units = requirement.units ?? 1;
                if (!Number.isInteger(units) || units < 1) {
                    throw new Error(`Capacity units for ${requirement.resourceId} must be a positive integer.`);
                }
                aggregated.set(requirement.resourceId, (aggregated.get(requirement.resourceId) ?? 0) + units);
            }

            let reason: string | undefined;
            for (const [resourceId, units] of aggregated) {
                const resource = this.resources.get(resourceId);
                if (!resource) {
                    reason = `RESOURCE_UNAVAILABLE:${resourceId}`;
                    break;
                }
                const reserved = usage.get(resourceId) ?? 0;
                if (resource.inUse + reserved + units > resource.limit) {
                    reason = `CAPACITY_LIMIT:${resourceId}`;
                    break;
                }
            }

            if (reason) {
                rejected.push(candidate);
                rejectionReasons[candidate.objective.id] = reason;
                continue;
            }

            selected.push(candidate);
            for (const [resourceId, units] of aggregated) {
                usage.set(resourceId, (usage.get(resourceId) ?? 0) + units);
            }
        }

        const capacity: Record<string, { limit: number; initialInUse: number; reserved: number; remaining: number }> = {};
        for (const [resourceId, resource] of this.resources) {
            const reserved = usage.get(resourceId) ?? 0;
            capacity[resourceId] = {
                limit: resource.limit,
                initialInUse: resource.inUse,
                reserved,
                remaining: resource.limit - resource.inUse - reserved,
            };
        }

        return {
            selected,
            rejected,
            capacity,
            evidence: {
                source: "v8d-executive-capacity-gate",
                candidateCount: candidates.length,
                selectedObjectiveIds: selected.map((candidate) => candidate.objective.id),
                rejectedObjectiveIds: rejected.map((candidate) => candidate.objective.id),
                rejectionReasons,
                capacity,
            },
        };
    }
}
