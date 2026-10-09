import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../shared/database/client.js";
import type { WorkflowStep } from "../workflow/workflow-step.js";
import type { ExecutionOwnership } from "../ownership.js";
import type {
    ActuationIdempotencyClaim,
    ActuationIdempotencyStore,
} from "./production-actuation-governance.js";
import type { ProductionActuationResult } from "./production-actuator.js";

function ownershipKey(ownership?: ExecutionOwnership): string {
    if (!ownership) return "UNSCOPED";
    return ownership.scope === "COMPANY"
        ? `COMPANY:${ownership.companyId}`
        : "SYSTEM";
}

function jsonResult(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function fromJson(value: Prisma.JsonValue | null): ProductionActuationResult | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }
    return value as unknown as ProductionActuationResult;
}

/**
 * Durable idempotency store for production actuation.
 *
 * The database unique constraint is the cross-process claim boundary. Existing
 * IN_FLIGHT records without a local waiter are treated as UNKNOWN: the previous
 * process may have died after the provider accepted the action. Reconciliation,
 * not automatic re-execution, is required.
 */
export class PrismaActuationIdempotencyStore implements ActuationIdempotencyStore {
    private readonly localInFlight = new Map<
        string,
        {
            completion: Promise<ProductionActuationResult>;
            resolve: (result: ProductionActuationResult) => void;
        }
    >();

    constructor(private readonly db: PrismaClient = prisma) {}

    async claim(key: string, step?: WorkflowStep): Promise<ActuationIdempotencyClaim> {
        const local = this.localInFlight.get(key);
        if (local) {
            return { status: "IN_FLIGHT", completion: local.completion };
        }

        try {
            await this.db.productionActuationIdempotency.create({
                data: {
                    idempotencyKey: key,
                    ownershipScope: ownershipKey(step?.ownership),
                    companyId: step?.ownership?.scope === "COMPANY"
                        ? step.ownership.companyId
                        : null,
                    workflowId: step?.workflowId ?? "unknown",
                    stepId: step?.id ?? "unknown",
                    status: "IN_FLIGHT",
                },
            });

            let resolve!: (result: ProductionActuationResult) => void;
            const completion = new Promise<ProductionActuationResult>(resolver => {
                resolve = resolver;
            });
            this.localInFlight.set(key, { completion, resolve });
            return { status: "ACQUIRED" };
        } catch (error) {
            const existing = await this.db.productionActuationIdempotency.findUnique({
                where: { idempotencyKey: key },
            });

            if (!existing) {
                throw error;
            }

            const nowLocal = this.localInFlight.get(key);
            if (nowLocal && existing.status === "IN_FLIGHT") {
                return { status: "IN_FLIGHT", completion: nowLocal.completion };
            }

            const result = fromJson(existing.result);

            if (existing.status === "COMPLETED" && result) {
                return { status: "COMPLETED", result };
            }

            if (existing.status === "UNKNOWN" && result) {
                return { status: "UNKNOWN", result };
            }

            // IN_FLIGHT with no local owner indicates a different process or a
            // process restart. Do not wait forever and never re-enter the provider.
            return {
                status: "UNKNOWN",
                result: {
                    allowed: true,
                    boundary: "V6_EXECUTION_AUTHORITY",
                    context: {
                        workflowId: existing.workflowId,
                        stepId: existing.stepId,
                    },
                    reason:
                        "A durable actuation claim already exists without a live local owner. The prior process may have stopped after external acceptance; reconciliation is required.",
                },
            };
        }
    }

    async complete(
        key: string,
        result: ProductionActuationResult,
        disposition: "COMPLETED" | "UNKNOWN" | "RELEASED",
    ): Promise<void> {
        if (disposition === "RELEASED") {
            await this.db.productionActuationIdempotency.deleteMany({
                where: { idempotencyKey: key, status: "IN_FLIGHT" },
            });
        } else {
            await this.db.productionActuationIdempotency.update({
                where: { idempotencyKey: key },
                data: {
                    status: disposition,
                    result: jsonResult(result),
                    lastError: disposition === "UNKNOWN"
                        ? (result.reason ?? "External actuation outcome is unknown.")
                        : null,
                },
            });
        }

        const local = this.localInFlight.get(key);
        if (local) {
            this.localInFlight.delete(key);
            local.resolve(result);
        }
    }
}
