import type { WorkflowStep } from "../workflow/workflow-step.js";
import type { ExecutionOwnership } from "../ownership.js";
import {
    ProductionActuatorComposition,
    type ProductionActuationResult,
} from "./production-actuator.js";
import { PrismaActuationIdempotencyStore } from "./prisma-actuation-idempotency-store.js";

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
      }
    | {
        readonly status: "UNKNOWN";
        readonly result: ProductionActuationResult;
      };

export interface ActuationIdempotencyStore {
    claim(key: string, step?: WorkflowStep): Promise<ActuationIdempotencyClaim> | ActuationIdempotencyClaim;
    complete(
        key: string,
        result: ProductionActuationResult,
        disposition: "COMPLETED" | "UNKNOWN" | "RELEASED",
    ): Promise<void> | void;
}

export interface GuardedProductionActuationResult extends ProductionActuationResult {
    readonly outcome: ProductionActuationOutcome;
    readonly idempotencyKey: string;
    readonly replayed?: boolean;
}

export class InMemoryActuationIdempotencyStore implements ActuationIdempotencyStore {
    private readonly results = new Map<string, ProductionActuationResult>();
    private readonly unknowns = new Map<string, ProductionActuationResult>();
    private readonly inFlight = new Map<
        string,
        {
            readonly completion: Promise<ProductionActuationResult>;
            readonly resolve: (result: ProductionActuationResult) => void;
        }
    >();

    claim(key: string): ActuationIdempotencyClaim {
        const unknown = this.unknowns.get(key);

        if (unknown) {
            return { status: "UNKNOWN", result: unknown };
        }

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
        disposition: "COMPLETED" | "UNKNOWN" | "RELEASED",
    ): void {
        if (disposition === "COMPLETED") {
            this.results.set(key, result);
        } else if (disposition === "UNKNOWN") {
            this.unknowns.set(key, result);
        } else {
            this.results.delete(key);
            this.unknowns.delete(key);
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
        private readonly idempotency: ActuationIdempotencyStore = new PrismaActuationIdempotencyStore(),
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

        const authorizedCapability = step.capability?.trim();
        // Recipient and other actuator parameters live inside WorkflowStep.input.
        // Snapshot the complete JSON payload before the asynchronous policy seam
        // so a policy/extension cannot swap the destination after authorization.
        let authorizedInputSnapshot: string;
        try {
            authorizedInputSnapshot = JSON.stringify(step.input ?? null);
        } catch {
            return {
                allowed: false,
                boundary: "V6_EXECUTION_AUTHORITY",
                context: {
                    workflowId: step.workflowId ?? "",
                    stepId: step.id,
                    capability: step.capability,
                },
                reason: "Production actuation input must be serializable before authorization.",
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

        // Authorization applies to the exact capability observed before the
        // asynchronous policy call. Reject mutation before selecting an actuator.
        if (step.capability?.trim() !== authorizedCapability) {
            return {
                allowed: false,
                boundary: "V6_EXECUTION_AUTHORITY",
                context: {
                    workflowId: step.workflowId ?? "",
                    stepId: step.id,
                    capability: step.capability,
                },
                reason: "Production actuation capability changed during authorization.",
                outcome: "BLOCKED",
                idempotencyKey,
            };
        }

        if (JSON.stringify(step.input ?? null) !== authorizedInputSnapshot) {
            return {
                allowed: false,
                boundary: "V6_EXECUTION_AUTHORITY",
                context: {
                    workflowId: step.workflowId ?? "",
                    stepId: step.id,
                    capability: step.capability,
                },
                reason: "Production actuation input changed during authorization.",
                outcome: "BLOCKED",
                idempotencyKey,
            };
        }

        const claim = await this.idempotency.claim(idempotencyKey, step);

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

        if (claim.status === "UNKNOWN") {
            return {
                ...claim.result,
                outcome: "UNKNOWN",
                idempotencyKey,
                // UNKNOWN is a fail-closed refusal to replay, not a replayed result.
                replayed: false,
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
                        : recovered.allowed && !recovered.result && recovered.reason
                            ? "UNKNOWN"
                            : "FAILED",
                idempotencyKey,
                replayed: true,
            };
        }

        let result: ProductionActuationResult;
        try {
            result = await this.composition.dispatch(step);
        } catch (error) {
            // An exception while dispatching may happen after external acceptance.
            // Classify it as UNKNOWN and never automatically execute it again.
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

            try {
                await this.idempotency.complete(idempotencyKey, unknown, "UNKNOWN");
            } catch (persistenceError) {
                // The store fails closed for local waiters. Do not make a second
                // write attempt: the first write may have committed ambiguously.
                return {
                    ...unknown,
                    reason:
                        `Actuation outcome is UNKNOWN and recording that state also failed: ${persistenceError instanceof Error ? persistenceError.message : String(persistenceError)}. Reconciliation is required; automatic retry is blocked.`,
                    outcome: "UNKNOWN",
                    idempotencyKey,
                    replayed: false,
                };
            }

            return {
                ...unknown,
                outcome: "UNKNOWN",
                idempotencyKey,
                replayed: false,
            };
        }

        const outcome = result.result?.verified
            ? "VERIFIED"
            : result.result?.executed
                ? "EXECUTED"
                : result.allowed
                    ? "FAILED"
                    : "BLOCKED";

        // Persisting the result is a separate failure domain from execution.
        // If this write throws, it may still have committed; preserve provider
        // evidence in the returned value, but report UNKNOWN and never overwrite
        // the possibly committed row with a second best-effort write.
        try {
            await this.idempotency.complete(
                idempotencyKey,
                result,
                result.result?.executed ? "COMPLETED" : "RELEASED",
            );
        } catch (error) {
            return {
                ...result,
                allowed: true,
                reason:
                    `Actuator returned a result, but durable idempotency persistence failed or was ambiguous: ${error instanceof Error ? error.message : String(error)}. Preserve external evidence and reconcile before any retry.`,
                outcome: "UNKNOWN",
                idempotencyKey,
                replayed: false,
            };
        }

        return {
            ...result,
            outcome,
            idempotencyKey,
        };
    }
}
