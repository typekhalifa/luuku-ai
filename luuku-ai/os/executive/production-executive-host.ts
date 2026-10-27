import { prisma } from "../../shared/database/client.js";
import { AgentRegistry } from "../agents/registry.js";
import { AgentDiscovery } from "../agents/discovery.js";
import { CapabilityResolver } from "../planning/capability-resolver.js";
import { PrismaQueueStore } from "../../orchestration/queue/prisma-queue-store.js";
import { PrismaWorkflowStore } from "../../orchestration/workflow/prisma-workflow-store.js";
import { PrismaExecutiveMemoryStore } from "./prisma-executive-memory-store.js";
import { PrismaExecutiveObjectiveStore } from "./prisma-executive-objective-store.js";
import { PrismaExecutiveLoopCheckpointStore } from "./prisma-executive-loop-checkpoint-store.js";
import { createExecutiveComposition, type ExecutiveComposition } from "./executive-composition.js";
import type { AutonomyPolicyRule } from "./autonomy-policy.js";
import type { Agent } from "../../shared/agents/interface.js";
import { logStructured } from "../../shared/observability/index.js";

interface TenantExecutiveHost {
    readonly companyId: string;
    readonly composition: ExecutiveComposition;
}

function getExecutiveIntervalMs(): number {
    const raw = process.env.LUUKU_EXECUTIVE_INTERVAL_MS;
    const intervalMs = raw === undefined || raw.trim() === "" ? 60_000 : Number(raw);
    if (!Number.isFinite(intervalMs) || intervalMs < 1) {
        throw new Error("LUUKU_EXECUTIVE_INTERVAL_MS must be a finite number greater than or equal to 1.");
    }
    return intervalMs;
}

/**
 * Production composition root for Phase 4.
 *
 * The host owns tenant lifecycle and dependency wiring only. It does not
 * execute work itself. Any future autonomous action still crosses the
 * existing executive -> V6 runtime -> production actuator boundary.
 *
 * Recovery/intervention intents are deliberately observed but not submitted
 * until a real production capability is registered for them.
 */
export class ProductionExecutiveHost {
    private readonly tenants = new Map<string, TenantExecutiveHost>();
    private refreshTimer: ReturnType<typeof setInterval> | undefined;
    private started = false;
    private startPromise: Promise<void> | undefined;
    private stopPromise: Promise<void> | undefined;
    private refreshPromise: Promise<void> | undefined;

    isStarted(): boolean {
        return this.started;
    }

    async start(): Promise<void> {
        if (this.started) return;
        if (this.startPromise) return this.startPromise;

        const operation = this.startInternal();
        this.startPromise = operation;
        try {
            await operation;
        } finally {
            if (this.startPromise === operation) this.startPromise = undefined;
        }
    }

    private async startInternal(): Promise<void> {
        const intervalMs = getExecutiveIntervalMs();
        try {
            await this.refreshTenants();
            this.refreshTimer = setInterval(() => {
                void this.refreshTenants().catch((error) => {
                    logStructured("ERROR", "executive.tenant_refresh_failed", {
                        error: error instanceof Error ? error.message : String(error),
                    });
                });
            }, intervalMs);
            this.started = true;
            logStructured("INFO", "executive.production.started", {
                intervalMs,
                tenantCount: this.tenants.size,
                executionAuthority: "V6",
            });
        } catch (error) {
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
                this.refreshTimer = undefined;
            }
            const cleanup = await Promise.allSettled(
                [...this.tenants.values()].map(({ composition }) => composition.service.stop()),
            );
            this.tenants.clear();
            for (const result of cleanup) {
                if (result.status === "rejected") {
                    logStructured("ERROR", "executive.startup_cleanup_failed", {
                        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
                    });
                }
            }
            this.started = false;
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (this.stopPromise) return this.stopPromise;
        const operation = this.stopInternal();
        this.stopPromise = operation;
        try {
            await operation;
        } finally {
            if (this.stopPromise === operation) this.stopPromise = undefined;
        }
    }

    private async stopInternal(): Promise<void> {
        if (this.startPromise) await this.startPromise.catch(() => undefined);
        this.started = false;
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = undefined;
        }
        if (this.refreshPromise) await this.refreshPromise.catch(() => undefined);

        const cleanup = await Promise.allSettled(
            [...this.tenants.values()].map(({ composition }) => composition.service.stop()),
        );
        this.tenants.clear();
        for (const result of cleanup) {
            if (result.status === "rejected") {
                logStructured("ERROR", "executive.shutdown_cleanup_failed", {
                    error: result.reason instanceof Error ? result.reason.message : String(result.reason),
                });
            }
        }
        logStructured("INFO", "executive.production.stopped", {
            executionAuthority: "V6",
        });
    }

    private async refreshTenants(): Promise<void> {
        if (this.refreshPromise) return this.refreshPromise;
        const operation = this.refreshTenantsInternal();
        this.refreshPromise = operation;
        try {
            await operation;
        } finally {
            if (this.refreshPromise === operation) this.refreshPromise = undefined;
        }
    }

    private async refreshTenantsInternal(): Promise<void> {
        const companies = await prisma.company.findMany({
            select: { id: true },
            orderBy: { createdAt: "asc" },
        });

        const activeIds = new Set(companies.map((company) => company.id));

        for (const company of companies) {
            if (this.tenants.has(company.id)) continue;
            const host = this.createTenantHost(company.id);
            this.tenants.set(company.id, host);
            host.composition.service.start();
        }

        const stale = [...this.tenants.keys()].filter((id) => !activeIds.has(id));
        await Promise.all(stale.map(async (companyId) => {
            const host = this.tenants.get(companyId);
            if (!host) return;
            await host.composition.service.stop();
            this.tenants.delete(companyId);
        }));
    }

    private createTenantHost(companyId: string): TenantExecutiveHost {
        const ownership = { scope: "COMPANY" as const, companyId };

        const agentRegistry = new AgentRegistry();
        const salesAgent: Agent = {
            id: "sales",
            name: "Sales Agent",
            role: "Sales",
            async execute() {
                throw new Error(
                    "Production executive capability bridge is not directly executable; V6 production actuators remain the execution boundary.",
                );
            },
        };

        // Capability discovery is explicit. The real production email side
        // effect remains behind the existing V6 production actuator.
        agentRegistry.register({
            agent: salesAgent,
            capabilities: ["email.send"],
        });

        const capabilityResolver = new CapabilityResolver(
            new AgentDiscovery(agentRegistry),
        );

        const policyRules: readonly AutonomyPolicyRule[] = [];

        const composition = createExecutiveComposition({
            ownership,
            workflowStore: new PrismaWorkflowStore(ownership),
            queueStore: new PrismaQueueStore(ownership),
            capabilityResolver,
            objectiveStore: new PrismaExecutiveObjectiveStore(ownership),
            memoryStore: new PrismaExecutiveMemoryStore(ownership),
            checkpointStore: new PrismaExecutiveLoopCheckpointStore(ownership),
            capabilities: {},
            policyRules,
            executeRuntime: false,
            intervalMs: getExecutiveIntervalMs(),
            runImmediately: true,
            onError: (error) => {
                logStructured("ERROR", "executive.cycle.failed", {
                    companyId,
                    error: error instanceof Error ? error.message : String(error),
                });
            },
        });

        return { companyId, composition };
    }
}

export const productionExecutiveHost = new ProductionExecutiveHost();
