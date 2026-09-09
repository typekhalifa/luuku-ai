export type ExecutiveBudgetDecision = "ALLOCATE" | "DEFER" | "DENY";

export interface ExecutiveBudgetResource {
  readonly id: string;
  readonly limit: number;
  readonly spent?: number;
}

export interface ExecutiveBudgetRequirement {
  readonly resourceId: string;
  readonly units?: number;
}

export interface ExecutiveBudgetCandidate {
  readonly id: string;
  readonly priorityScore: number;
  readonly requirements: readonly ExecutiveBudgetRequirement[];
}

export interface ExecutiveBudgetAllocation {
  readonly candidateId: string;
  readonly decision: ExecutiveBudgetDecision;
  readonly reserved: Readonly<Record<string, number>>;
  readonly reason: string;
}

export interface ExecutiveBudgetResult {
  readonly allocations: readonly ExecutiveBudgetAllocation[];
  readonly remaining: Readonly<Record<string, number>>;
  readonly evidence: Readonly<Record<string, unknown>>;
}

export class ExecutiveResourceBudget {
  private readonly resources: Map<string, ExecutiveBudgetResource>;

  constructor(resources: readonly ExecutiveBudgetResource[]) {
    this.resources = new Map();
    for (const resource of resources) {
      if (!resource.id.trim()) throw new Error("Resource id is required");
      if (!Number.isFinite(resource.limit) || resource.limit < 0) {
        throw new Error(`Invalid resource limit: ${resource.id}`);
      }
      const spent = resource.spent ?? 0;
      if (!Number.isFinite(spent) || spent < 0 || spent > resource.limit) {
        throw new Error(`Invalid resource spend: ${resource.id}`);
      }
      if (this.resources.has(resource.id)) throw new Error(`Duplicate resource: ${resource.id}`);
      this.resources.set(resource.id, { ...resource, spent });
    }
  }

  allocate(candidates: readonly ExecutiveBudgetCandidate[]): ExecutiveBudgetResult {
    const remaining: Record<string, number> = {};
    for (const resource of this.resources.values()) {
      remaining[resource.id] = resource.limit - (resource.spent ?? 0);
    }

    const allocations: ExecutiveBudgetAllocation[] = [];
    for (const candidate of candidates) {
      const requested: Record<string, number> = {};
      let invalid = false;
      let reason = "";

      for (const requirement of candidate.requirements) {
        const units = requirement.units ?? 1;
        if (!Number.isFinite(units) || units <= 0) {
          invalid = true;
          reason = `INVALID_REQUIREMENT:${requirement.resourceId}`;
          break;
        }
        if (!this.resources.has(requirement.resourceId)) {
          invalid = true;
          reason = `RESOURCE_UNAVAILABLE:${requirement.resourceId}`;
          break;
        }
        requested[requirement.resourceId] = (requested[requirement.resourceId] ?? 0) + units;
      }

      if (invalid) {
        allocations.push({ candidateId: candidate.id, decision: "DENY", reserved: {}, reason });
        continue;
      }

      const overBudget = Object.entries(requested).find(([resourceId, units]) => remaining[resourceId] < units);
      if (overBudget) {
        allocations.push({
          candidateId: candidate.id,
          decision: "DEFER",
          reserved: {},
          reason: `BUDGET_LIMIT:${overBudget[0]}`,
        });
        continue;
      }

      for (const [resourceId, units] of Object.entries(requested)) remaining[resourceId] -= units;
      allocations.push({ candidateId: candidate.id, decision: "ALLOCATE", reserved: requested, reason: "BUDGET_AVAILABLE" });
    }

    return {
      allocations,
      remaining,
      evidence: {
        source: "V8-E_RESOURCE_BUDGET",
        candidateCount: candidates.length,
        allocated: allocations.filter((item) => item.decision === "ALLOCATE").map((item) => item.candidateId),
        deferred: allocations.filter((item) => item.decision === "DEFER").map((item) => item.candidateId),
        denied: allocations.filter((item) => item.decision === "DENY").map((item) => item.candidateId),
      },
    };
  }
}
