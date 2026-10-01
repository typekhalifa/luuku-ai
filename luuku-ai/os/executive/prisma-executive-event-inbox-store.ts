import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/database/client.js";
import { normalizeExecutionOwnership, ownershipMatches, type ExecutionOwnership } from "../../orchestration/ownership.js";
import type {
    ExecutiveEventInboxRecord,
    ExecutiveEventInboxStore,
} from "./executive-event-inbox.js";

const toRecord = (record: {
    id: string;
    ownershipScope: string;
    companyId: string | null;
    type: string;
    occurredAt: Date;
    metadata: Prisma.JsonValue | null;
    status: string;
    attempts: number;
    processingStartedAt: Date | null;
    deliveredAt: Date | null;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
}): ExecutiveEventInboxRecord => ({
    id: record.id,
    ownership: parseOwnership(record.ownershipScope, record.companyId),
    type: record.type,
    occurredAt: record.occurredAt,
    metadata: record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
        ? record.metadata as Readonly<Record<string, unknown>>
        : undefined,
    status: record.status as ExecutiveEventInboxRecord["status"],
    attempts: record.attempts,
    processingStartedAt: record.processingStartedAt ?? undefined,
    deliveredAt: record.deliveredAt ?? undefined,
    lastError: record.lastError ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
});

export class PrismaExecutiveEventInboxStore implements ExecutiveEventInboxStore {
    private readonly ownership: ExecutionOwnership;

    constructor(ownership?: ExecutionOwnership) {
        this.ownership = normalizeExecutionOwnership(ownership);
    }

    async receive(event: ExecutiveEventInboxRecord): Promise<"RECEIVED" | "DUPLICATE"> {
        const eventOwnership = normalizeExecutionOwnership(event.ownership);
        if (!ownershipMatches(this.ownership, eventOwnership)) {
            throw new Error("Executive event inbox ownership mismatch.");
        }

        try {
            await prisma.executiveEventInbox.create({
                data: {
                    id: event.id,
                    ownershipScope: eventOwnership.scope,
                    companyId: eventOwnership.scope === "COMPANY" ? eventOwnership.companyId : null,
                    type: event.type,
                    occurredAt: event.occurredAt,
                    metadata: event.metadata as Prisma.InputJsonValue | undefined,
                    status: "PENDING",
                    attempts: 0,
                    processingStartedAt: null,
                    deliveredAt: null,
                    lastError: null,
                    createdAt: event.createdAt,
                    updatedAt: event.updatedAt,
                },
            });
            return "RECEIVED";
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                const existing = await prisma.executiveEventInbox.findUnique({
                    where: { id: event.id },
                    select: { ownershipScope: true, companyId: true },
                });
                if (!existing) throw error;

                const existingOwnership = parseOwnership(existing.ownershipScope, existing.companyId);
                if (!ownershipMatches(this.ownership, existingOwnership)) {
                    throw new Error("Executive event inbox ownership mismatch.");
                }
                return "DUPLICATE";
            }
            throw error;
        }
    }

    async claimNext(now: Date, staleAfterMs: number): Promise<ExecutiveEventInboxRecord | undefined> {
        if (!Number.isFinite(staleAfterMs) || staleAfterMs < 1) {
            throw new Error("staleAfterMs must be at least 1 millisecond.");
        }

        const staleBefore = new Date(now.getTime() - staleAfterMs);
        const candidate = await prisma.executiveEventInbox.findFirst({
            where: {
                ownershipScope: this.ownership.scope,
                companyId: this.ownership.scope === "COMPANY" ? this.ownership.companyId : null,
                OR: [
                    { status: "PENDING" },
                    { status: "PROCESSING", processingStartedAt: { lt: staleBefore } },
                ],
            },
            orderBy: [
                { occurredAt: "asc" },
                { createdAt: "asc" },
            ],
        });

        if (!candidate) return undefined;

        const claimed = await prisma.executiveEventInbox.updateMany({
            where: {
                id: candidate.id,
                ownershipScope: this.ownership.scope,
                companyId: this.ownership.scope === "COMPANY" ? this.ownership.companyId : null,
                OR: [
                    { status: "PENDING" },
                    { status: "PROCESSING", processingStartedAt: { lt: staleBefore } },
                ],
            },
            data: {
                status: "PROCESSING",
                attempts: { increment: 1 },
                processingStartedAt: now,
                lastError: null,
                updatedAt: now,
            },
        });

        if (claimed.count !== 1) return undefined;

        const record = await prisma.executiveEventInbox.findUnique({
            where: { id: candidate.id },
        });

        return record ? toRecord(record) : undefined;
    }

    async markDelivered(id: string, deliveredAt: Date): Promise<void> {
        const updated = await prisma.executiveEventInbox.updateMany({
            where: {
                id,
                ownershipScope: this.ownership.scope,
                companyId: this.ownership.scope === "COMPANY" ? this.ownership.companyId : null,
            },
            data: {
                status: "DELIVERED",
                deliveredAt,
                processingStartedAt: null,
                lastError: null,
                updatedAt: deliveredAt,
            },
        });
        if (updated.count !== 1) throw new Error("Executive event inbox ownership mismatch.");
    }

    async markFailed(id: string, error: string): Promise<void> {
        const now = new Date();
        const updated = await prisma.executiveEventInbox.updateMany({
            where: {
                id,
                ownershipScope: this.ownership.scope,
                companyId: this.ownership.scope === "COMPANY" ? this.ownership.companyId : null,
            },
            data: {
                status: "FAILED",
                processingStartedAt: null,
                lastError: error,
                updatedAt: now,
            },
        });
        if (updated.count !== 1) throw new Error("Executive event inbox ownership mismatch.");
    }
}

function parseOwnership(scope: string, companyId: string | null): ExecutionOwnership {
    if (scope === "COMPANY" && companyId) return { scope: "COMPANY", companyId };
    if (scope === "SYSTEM" && companyId === null) return { scope: "SYSTEM" };
    throw new Error("Invalid persisted executive event ownership.");
}
