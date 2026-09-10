import type { ExecutiveLearningRecord } from "./executive-memory.js";
import type { ExecutiveObjectiveRecord, ExecutiveObjectiveStore } from "./objective-engine.js";

export type ExecutiveStrategyEvolutionAction =
    | "CREATE_OBJECTIVE"
    | "MODIFY_PRIORITY"
    | "DEFER_OBJECTIVE"
    | "NO_CHANGE";

export interface ExecutiveStrategyEvidence {
    readonly source: "V8-H_STRATEGY_EVOLUTION";
    readonly objectiveId?: string;
    readonly action?: string;
    readonly pattern?: string;
    readonly occurrences?: number;
    readonly successfulOccurrences?: number;
    readonly failedOccurrences?: number;
    readonly confidence?: number;
    readonly reason: string;
}

export interface ExecutiveObjectiveProposal {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly priority: "high" | "medium" | "low";
    readonly action: ExecutiveStrategyEvolutionAction;
    readonly targetObjectiveId?: string;
    readonly evidence: readonly ExecutiveStrategyEvidence[];
}

export interface ExecutiveStrategyEvolutionDecision {
    readonly proposals: readonly ExecutiveObjectiveProposal[];
    readonly createdObjectiveIds: readonly string[];
    readonly modifiedObjectiveIds: readonly string[];
    readonly deferredObjectiveIds: readonly string[];
    readonly evidence: readonly ExecutiveStrategyEvidence[];
}

export interface ExecutiveStrategyEvolutionOptions {
    readonly maxProposals?: number;
    readonly minConfidence?: number;
    readonly applyChanges?: boolean;
}

/** V8-H turns durable learning and current objective state into bounded strategic objective evolution. It changes executive state only; it never executes work. */
export class ExecutiveStrategyEvolutionEngine {
    private readonly maxProposals: number;
    private readonly minConfidence: number;
    private readonly applyChanges: boolean;

    constructor(
        private readonly store: ExecutiveObjectiveStore,
        options: ExecutiveStrategyEvolutionOptions = {},
    ) {
        this.maxProposals = Math.max(1, options.maxProposals ?? 3);
        this.minConfidence = Math.min(1, Math.max(0, options.minConfidence ?? 0.5));
        this.applyChanges = options.applyChanges ?? true;
    }

    async evolve(
        objectives: readonly ExecutiveObjectiveRecord[],
        learning: readonly ExecutiveLearningRecord[],
    ): Promise<ExecutiveStrategyEvolutionDecision> {
        const existingIds = new Set(objectives.map((objective) => objective.id));
        const proposals: ExecutiveObjectiveProposal[] = [];
        const evidence: ExecutiveStrategyEvidence[] = [];

        for (const record of learning) {
            if (proposals.length >= this.maxProposals) break;

            const actionableFailure = record.pattern === "REPEATED_FAILURE" && record.failedOccurrences >= 2;
            const actionableSuccess = record.pattern === "SUCCESS_PATTERN" && record.confidence >= this.minConfidence;
            if (!actionableFailure && !actionableSuccess) continue;

            const objectiveSeed = record.objectiveIds.join("-");
            const id = this.stableObjectiveId(`${actionableFailure ? "improve" : "scale"}-${record.action}-${objectiveSeed}`);
            if (existingIds.has(id)) continue;

            const item = actionableFailure
                ? this.proposeFailureRecovery(record, id)
                : this.proposeSuccessScaling(record, id);
            proposals.push(item);
            evidence.push(...item.evidence);
        }

        for (const objective of objectives) {
            if (proposals.length >= this.maxProposals) break;
            if (objective.status !== "ACTIVE") continue;
            if (objective.progress >= 80) continue;
            if (!this.isStaleOrStagnant(objective)) continue;

            const priority = objective.priority === "low" ? "medium" : "high";
            const item: ExecutiveObjectiveProposal = {
                id: objective.id,
                title: objective.title,
                description: objective.description,
                priority,
                action: "MODIFY_PRIORITY",
                targetObjectiveId: objective.id,
                evidence: [{
                    source: "V8-H_STRATEGY_EVOLUTION",
                    objectiveId: objective.id,
                    reason: "Active objective is stale or stagnant and should receive greater strategic attention.",
                }],
            };
            proposals.push(item);
            evidence.push(...item.evidence);
        }

        const createdObjectiveIds: string[] = [];
        const modifiedObjectiveIds: string[] = [];
        const deferredObjectiveIds: string[] = [];

        if (this.applyChanges) {
            for (const proposal of proposals) {
                if (proposal.action === "CREATE_OBJECTIVE") {
                    const created: ExecutiveObjectiveRecord = {
                        id: proposal.id,
                        title: proposal.title,
                        description: proposal.description,
                        priority: proposal.priority,
                        status: "ACTIVE",
                        progress: 0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    await this.store.save(created);
                    createdObjectiveIds.push(created.id);
                } else if (proposal.action === "MODIFY_PRIORITY" && proposal.targetObjectiveId) {
                    const existing = await this.store.get(proposal.targetObjectiveId);
                    if (!existing || existing.priority === proposal.priority) continue;
                    await this.store.save({ ...existing, priority: proposal.priority, updatedAt: new Date() });
                    modifiedObjectiveIds.push(existing.id);
                } else if (proposal.action === "DEFER_OBJECTIVE" && proposal.targetObjectiveId) {
                    const existing = await this.store.get(proposal.targetObjectiveId);
                    if (!existing || existing.status !== "ACTIVE") continue;
                    await this.store.save({ ...existing, status: "PAUSED", updatedAt: new Date() });
                    deferredObjectiveIds.push(existing.id);
                }
            }
        }

        return { proposals, createdObjectiveIds, modifiedObjectiveIds, deferredObjectiveIds, evidence };
    }

    private proposeFailureRecovery(record: ExecutiveLearningRecord, id: string): ExecutiveObjectiveProposal {
        const evidence: ExecutiveStrategyEvidence = {
            source: "V8-H_STRATEGY_EVOLUTION",
            action: record.action,
            pattern: record.pattern,
            occurrences: record.occurrences,
            successfulOccurrences: record.successfulOccurrences,
            failedOccurrences: record.failedOccurrences,
            confidence: record.confidence,
            reason: "Repeated historical failure indicates a strategic need to improve the affected capability before repeating the same operating pattern.",
        };
        return {
            id,
            title: `Improve reliability of ${record.action}`,
            description: record.lesson ?? `Reduce repeated failure in the ${record.action} operating pattern before scaling it further.`,
            priority: "high",
            action: "CREATE_OBJECTIVE",
            evidence: [evidence],
        };
    }

    private proposeSuccessScaling(record: ExecutiveLearningRecord, id: string): ExecutiveObjectiveProposal {
        const evidence: ExecutiveStrategyEvidence = {
            source: "V8-H_STRATEGY_EVOLUTION",
            action: record.action,
            pattern: record.pattern,
            occurrences: record.occurrences,
            successfulOccurrences: record.successfulOccurrences,
            failedOccurrences: record.failedOccurrences,
            confidence: record.confidence,
            reason: "Historical success supports creating a bounded objective to reproduce or scale the successful operating pattern.",
        };
        return {
            id,
            title: `Scale successful ${record.action}`,
            description: record.lesson ?? `Increase the useful impact of the ${record.action} operating pattern while preserving existing safety and resource boundaries.`,
            priority: "medium",
            action: "CREATE_OBJECTIVE",
            evidence: [evidence],
        };
    }

    private isStaleOrStagnant(objective: ExecutiveObjectiveRecord): boolean {
        if (objective.previousProgress !== undefined && objective.progress <= objective.previousProgress) return true;
        if (!objective.staleAfterDays) return false;
        const ageDays = (Date.now() - objective.updatedAt.getTime()) / 86_400_000;
        return ageDays >= objective.staleAfterDays;
    }

    private stableObjectiveId(seed: string): string {
        const normalized = seed.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return `objective-${normalized}`;
    }
}
