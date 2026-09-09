export type ExecutiveTradeoffDecision = "SELECT" | "DEFER" | "REJECT";

export interface ExecutiveTradeoffCandidate {
  readonly id: string;
  readonly objectiveValue: number;
  readonly urgency: number;
  readonly strategicImpact: number;
  readonly resourceCost: number;
  readonly risk: number;
}

export interface ExecutiveTradeoffScore {
  readonly candidateId: string;
  readonly valueScore: number;
  readonly costScore: number;
  readonly riskPenalty: number;
  readonly netScore: number;
}

export interface ExecutiveTradeoffAllocation {
  readonly candidateId: string;
  readonly decision: ExecutiveTradeoffDecision;
  readonly score: ExecutiveTradeoffScore;
  readonly reason: string;
}

export interface ExecutiveTradeoffResult {
  readonly allocations: readonly ExecutiveTradeoffAllocation[];
  readonly evidence: Readonly<Record<string, unknown>>;
}

export interface ExecutiveTradeoffOptions {
  readonly minimumNetScore?: number;
}

export class ExecutiveTradeoffEngine {
  private readonly minimumNetScore: number;

  constructor(options: ExecutiveTradeoffOptions = {}) {
    this.minimumNetScore = options.minimumNetScore ?? 0;
  }

  evaluate(candidates: readonly ExecutiveTradeoffCandidate[]): ExecutiveTradeoffResult {
    const allocations: ExecutiveTradeoffAllocation[] = candidates.map((candidate) => {
      this.validate(candidate);
      const valueScore = candidate.objectiveValue + candidate.urgency + candidate.strategicImpact;
      const costScore = candidate.resourceCost;
      const riskPenalty = candidate.risk;
      const netScore = valueScore - costScore - riskPenalty;
      const score: ExecutiveTradeoffScore = {
        candidateId: candidate.id,
        valueScore,
        costScore,
        riskPenalty,
        netScore,
      };

      if (netScore < this.minimumNetScore) {
        return { candidateId: candidate.id, decision: "REJECT", score, reason: "NEGATIVE_EXPECTED_VALUE" };
      }
      if (netScore === this.minimumNetScore) {
        return { candidateId: candidate.id, decision: "DEFER", score, reason: "MARGINAL_EXPECTED_VALUE" };
      }
      return { candidateId: candidate.id, decision: "SELECT", score, reason: "POSITIVE_EXPECTED_VALUE" };
    });

    return {
      allocations,
      evidence: {
        source: "V8-F_TRADEOFF_ECONOMICS",
        candidateCount: candidates.length,
        selected: allocations.filter((item) => item.decision === "SELECT").map((item) => item.candidateId),
        deferred: allocations.filter((item) => item.decision === "DEFER").map((item) => item.candidateId),
        rejected: allocations.filter((item) => item.decision === "REJECT").map((item) => item.candidateId),
      },
    };
  }

  private validate(candidate: ExecutiveTradeoffCandidate): void {
    if (!candidate.id.trim()) throw new Error("Candidate id is required");
    for (const value of [candidate.objectiveValue, candidate.urgency, candidate.strategicImpact, candidate.resourceCost, candidate.risk]) {
      if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid tradeoff value: ${candidate.id}`);
    }
  }
}
