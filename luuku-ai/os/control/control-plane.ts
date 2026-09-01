import type { CapabilityResolver, CapabilityRequest, CapabilityResolution } from "../planning/capability-resolver.js";
import type { ExecutionPlan } from "../planning/execution-plan.js";
import type { ExecutiveBrief } from "../executive/executive-brief.js";
import { buildExecutiveBrief } from "../executive/executive-brief.js";
import type { ExecutiveState } from "../executive/executive-state.js";
import type { ExecutiveDecision, ExecutiveDecisionAction, DecisionResult } from "../executive/decision-surface.js";
import { ExecutiveDecisionSurface } from "../executive/decision-surface.js";
import type { ApprovalExecutionGate, ExecutionContinuation } from "../approval/approval-execution-gate.js";
import type { WorkflowStore } from "../../orchestration/workflow/workflow-store.js";
import type { QueueStore } from "../../orchestration/queue/queue.js";
import { DurableExecutiveStateSource } from "./durable-executive-state.js";

export interface ControlPlane {
    resolveCapability(request: CapabilityRequest): CapabilityResolution | undefined;
    inspect(): ExecutiveState;
    brief(): ExecutiveBrief;
    decisions(): readonly ExecutiveDecision[];
    decide(decisionId: string, action: ExecutiveDecisionAction): DecisionResult;
    executionEligibility(approvalId: string): ExecutionContinuation;
}

export interface ControlPlaneDependencies {
    resolver: CapabilityResolver;
    state: ExecutiveState;
    brief: ExecutiveBrief;
    decisions: readonly ExecutiveDecision[];
    executionGate: ApprovalExecutionGate;
}

export interface DurableControlPlaneDependencies {
    resolver: CapabilityResolver;
    workflows: WorkflowStore;
    queue: QueueStore;
    decisions: readonly ExecutiveDecision[];
    executionGate: ApprovalExecutionGate;
}

export class ExecutiveControlPlane implements ControlPlane {
    private readonly decisionSurface = new ExecutiveDecisionSurface();
    private readonly decisionMap: Map<string, ExecutiveDecision>;

    constructor(private readonly dependencies: ControlPlaneDependencies) {
        this.decisionMap = new Map(dependencies.decisions.map((decision) => [decision.id, decision]));
    }

    static async fromDurableTruth(dependencies: DurableControlPlaneDependencies): Promise<ExecutiveControlPlane> {
        const source = new DurableExecutiveStateSource(dependencies.workflows, dependencies.queue);
        const state = await source.snapshot();

        return new ExecutiveControlPlane({
            resolver: dependencies.resolver,
            state,
            brief: buildExecutiveBrief(state),
            decisions: dependencies.decisions,
            executionGate: dependencies.executionGate,
        });
    }

    resolveCapability(request: CapabilityRequest): CapabilityResolution | undefined {
        return this.dependencies.resolver.resolve(request);
    }

    inspect(): ExecutiveState { return this.dependencies.state; }

    brief(): ExecutiveBrief { return this.dependencies.brief; }

    decisions(): readonly ExecutiveDecision[] { return [...this.decisionMap.values()]; }

    decide(decisionId: string, action: ExecutiveDecisionAction): DecisionResult {
        const decision = this.decisionMap.get(decisionId);
        if (!decision) throw new Error(`Unknown executive decision: ${decisionId}`);
        return this.decisionSurface.decide(decision, action);
    }

    executionEligibility(approvalId: string): ExecutionContinuation {
        return this.dependencies.executionGate.evaluate(approvalId);
    }
}

export type { ExecutionPlan };
