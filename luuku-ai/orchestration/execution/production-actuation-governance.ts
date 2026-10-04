import type { WorkflowStep } from "../workflow/workflow-step.js";
import type { ExecutionOwnership } from "../ownership.js";
import {
    ProductionActuatorComposition,
    type ProductionActuationResult,
} from "./production-actuator.js";

export type ProductionActuationOutcome =
    | "BLOCKED"
    | "EXECUTED"
    | "VERIFIED"
    | "FAILED"
    | "UNKNOWN";

export interface ActuationAuthorizationDecision {
    readonly allowed: boolean;
    readonly reason?: string;
}

export interface ActuationAuthorizationPolicy {
    authorize(step: WorkflowStep): Promise<ActuationAuthorizationDecision> | ActuationAuthorizationDecision;
}

export interface ActuationControl {
    isEnabled(step: WorkflowStep): boolean;
    reason?: string;
}

export interface ActuationIdempotencyStore {
    get(key: string): Promise<ProductionActuationResult | undefined> | ProductionActuationResult | undefined;
    put(key: string, result: ProductionActuationResult): Promise<void> | void;
}

export interface GuardedProductionActuationResult extends ProductionActuationResult {
    readonly outcome: ProductionActuationOutcome;
    readonly idempotencyKey: string;
    readonly replayed?: boolean;
}

export class InMemoryActuationIdempotencyStore implements ActuationIdempotencyStore {
    private readonly results = new Map<string, ProductionActuationResult>();

    get(key: string): ProductionActuationResult | undefined {
        return this.results.get(key);
    }

    put(key: string, result: ProductionActuationResult): void {
        this.results.set(key, result);
    }
}

export class StaticActuationControl implements ActuationControl {
    constructor(
        private enabled = true,
        readonly reason = "External actuation is disabled by operator control.",
    ) {}

    isEnabled(): boolean {
        return this.enabled;
    }

    disable(): void {
        this.enabled = false;
    }

    enable(): void {
        this.enabled = true;
    }
}

export class CapabilityAgentAuthorizationPolicy implements ActuationAuthorizationPolicy {
    constructor(
        private readonly allowedAgentsByCapability: ReadonlyMap<string, ReadonlySet<string>>,
    ) {}

    authorize(step: WorkflowStep): ActuationAuthorizationDecision {
        const capability = step.capability?.trim();

        if (!capability) {
            return {
                allowed: false,
                reason: "Production actuation requires an explicit capability.",
            };
        }

        const allowedAgents = this.allowedAgentsByCapability.get(capability);

        if (!allowedAgents || !allowedAgents.has(step.agentId)) {
            return {
                allowed: false,
                reason: `Agent ${step.agentId} is not authorized for capability ${capability}.`,
            };
        }

        return { allowed: true };
    }
}

function ownershipKey(ownership?: ExecutionOwnership): string {
    if (!ownership) return "UNSCOPED";

    return ownership.scope === "COMPANY"
        ? `COMPANY:${ownership.companyId}`
        : "SYSTEM";
}

export function buildActuationIdempotencyKey(step: WorkflowStep): string {
    if (!step.workflowId?.trim()) {
        throw new Error("Production actuation requires a durable workflow identity.");
    }

    if (!step.id.trim()) {
        throw new Error("Production actuation requires a durable step identity.");
    }

    return `v1/${ownershipKey(step.ownership)}/${step.workflowId.trim()}/${step.id.trim()}`;
}

/**
 * Phase 5 governance gate.
 *
 * This class is deliberately not an execution engine. It adds explicit
 * authorization, operator control, ownership-scoped idempotency and
 * unknown-outcome handling around the existing V6 -> actuator composition.
 */
export class GuardedProductionActuation {
    constructor(
        private readonly composition: ProductionActuatorComposition,
        private readonly authorization: ActuationAuthorizationPolicy,
        private readonly control: ActuationControl,
        private readonly idempotency: ActuationIdempotencyStore = new InMemoryActuationIdempotencyStore(),
    ) {}

    async dispatch(step: WorkflowStep): Promise<GuardedProductionActuationResult> {
        const idempotencyKey = buildActuationIdempotencyKey(step);

        if (!this.control.isEnabled(step)) {
            return {
                allowed: false,
                boundary: "V6_EXECUTION_AUTHORITY",
                context: {
                    workflowId: step.workflowId ?? "",
                    stepId: step.id,
                    capability: step.capability,
                },
                reason: this.control.reason,
                outcome: "BLOCKED",
                idempotencyKey,
            };
        }

        const authorization = await this.authorization.authorize(step);

        if (!authorization.allowed) {
            return {
                allowed: false,
                boundary: "V6_EXECUTION_AUTHORITY",
                context: {
                    workflowId: step.workflowId ?? "",
                    stepId: step.id,
                    capability: step.capability,
                },
                reason: authorization.reason ?? "Production actuation was not authorized.",
                outcome: "BLOCKED",
                idempotencyKey,
            };
        }

        const recovered = await this.idempotency.get(idempotencyKey);

        if (recovered) {
            return {
                ...recovered,
                outcome: recovered.result?.verified
                    ? "VERIFIED"
                    : "EXECUTED",
                idempotencyKey,
                replayed: true,
            };
        }

        try {
            const result = await this.composition.dispatch(step);
            const outcome = result.result?.verified
                ? "VERIFIED"
                : result.result?.executed
                    ? "EXECUTED"
                    : result.allowed
                        ? "FAILED"
                        : "BLOCKED";

            const guarded: GuardedProductionActuationResult = {
                ...result,
                outcome,
                idempotencyKey,
            };

            // Only an action that crossed into execution is replay-safe.
            // Blocked/failed results remain retryable by a future V6 run.
            if (result.result?.executed) {
                await this.idempotency.put(idempotencyKey, result);
            }

            return guarded;
        } catch (error) {
            // An exception after entering the actuator is an UNKNOWN outcome:
            // the provider may have accepted the action before the process
            // observed the failure. Automatic replay is therefore forbidden.
            return {
                allowed: true,
                boundary: "V6_EXECUTION_AUTHORITY",
                context: {
                    workflowId: step.workflowId ?? "",
                    stepId: step.id,
                    capability: step.capability,
                },
                reason: error instanceof Error ? error.message : String(error),
                outcome: "UNKNOWN",
                idempotencyKey,
            };
        }
    }
}
