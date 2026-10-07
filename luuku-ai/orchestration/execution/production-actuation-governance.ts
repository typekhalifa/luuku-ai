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

export type ActuationIdempotencyClaim =
    | {
        readonly status: "ACQUIRED";
      }
    | {
        readonly status: "COMPLETED";
        readonly result: ProductionActuationResult;
      }
    | {
        readonly status: "IN_FLIGHT";
        readonly completion: Promise<ProductionActuationResult>;
      };

export interface ActuationIdempotencyStore {
    claim(key: string): Promise<ActuationIdempotencyClaim> | ActuationIdempotencyClaim;
    complete(
        key: string,
        result: ProductionActuationResult,
        persist: boolean,
    ): Promise<void> | void;
}

export interface GuardedProductionActuationResult extends ProductionActuationResult {
    readonly outcome: ProductionActuationOutcome;
    readonly idempotencyKey: string;
    readonly replayed?: boolean;
}

export class InMemoryActuationIdempotencyStore implements ActuationIdempotencyStore {
    private readonly results = new Map<string, ProductionActuationResult>();
    private readonly inFlight = new Map<
        string,
        {
            readonly completion: Promise<ProductionActuationResult>;
            readonly resolve: (result: ProductionActuationResult) => void;
        }
    >();

    claim(key: string): ActuationIdempotencyClaim {
        const recovered = this.results.get(key);

        if (recovered) {
            return {
                status: "COMPLETED",
                result: recovered,
            };
        }

        const existing = this.inFlight.get(key);

        if (existing) {
            return {
                status: "IN_FLIGHT",
                completion: existing.completion,
            };
        }

        let resolve!: (result: ProductionActuationResult) => void;

        const completion = new Promise<ProductionActuationResult>(resolver => {
            resolve = resolver;
        });

        this.inFlight.set(key, {
            completion,
            resolve,
        });

        return { status: "ACQUIRED" };
    }

    complete(
        key: string,
        result: ProductionActuationResult,
        persist: boolean,
    ): void {
        if (persist) {
            this.results.set(key, result);
        }

        const existing = this.inFlight.get(key);

        if (!existing) {
            return;
        }

        this.inFlight.delete(key);
        existing.resolve(result);
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

        const claim = await this.idempotency.claim(idempotencyKey);

        if (claim.status === "COMPLETED") {
            return {
                ...claim.result,
                outcome: claim.result.result?.verified
                    ? "VERIFIED"
                    : "EXECUTED",
                idempotencyKey,
                replayed: true,
            };
        }

        if (claim.status === "IN_FLIGHT") {
            const recovered = await claim.completion;

            return {
                ...recovered,
                outcome: recovered.result?.verified
                    ? "VERIFIED"
                    : recovered.result?.executed
                        ? "EXECUTED"
                        : "FAILED",
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
            // Failed/blocked results release the in-flight claim so a future
            // V6 run can retry. Concurrent callers still receive this exact
            // result and cannot enter the actuator while the winner runs.
            await this.idempotency.complete(
                idempotencyKey,
                result,
                Boolean(result.result?.executed),
            );

            return guarded;
        } catch (error) {
            // An exception after entering the actuator is an UNKNOWN outcome:
            // the provider may have accepted the action before the process
            // observed the failure. Do not persist UNKNOWN as a completed
            // replay, but resolve concurrent waiters with the same safe result.
            const unknown: ProductionActuationResult = {
                allowed: true,
                boundary: "V6_EXECUTION_AUTHORITY",
                context: {
                    workflowId: step.workflowId ?? "",
                    stepId: step.id,
                    capability: step.capability,
                },
                reason: error instanceof Error ? error.message : String(error),
            };

            await this.idempotency.complete(idempotencyKey, unknown, false);

            return {
                ...unknown,
                outcome: "UNKNOWN",
                idempotencyKey,
            };
        }
    }
}
