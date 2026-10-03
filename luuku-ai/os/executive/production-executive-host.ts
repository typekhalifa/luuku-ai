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
import type { ExecutiveIntent } from "./executive-intent.js";
import type { AutonomyPolicyRule } from "./autonomy-policy.js";
import type { Agent } from "../../shared/agents/interface.js";
import { logStructured } from "../../shared/observability/index.js";

interface TenantExecutiveHost {
    readonly companyId: string;
    readonly composition: ExecutiveComposition;
}

const EXECUTIVE_INTERVAL_MS = Number(process.env.LUUKU_EXECUTIVE_INTERVAL_MS || 60_000);

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

    async start(): Promise<void> {
        if (this.started) return;
        this.started = true;

        await this.refreshTenants();

        this.refreshTimer = setInterval(() => {
            void this.refreshTenants().catch((error) => {
                logStructured("ERROR", "executive.tenant_refresh_failed", {
                    error: error instanceof Error ? error.message : String(error),
                });
            });
        }, EXECUTIVE_INTERVAL_MS);

        logStructured("INFO", "executive.production.started", {
            intervalMs: EXECUTIVE_INTERVAL_MS,
            tenantCount: this.tenants.size,
            executionAuthority: "V6",
        });
    }

    async stop(): Promise<void> {
        if (!this.started) return;
        this.started = false;

        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = undefined;
        }

        const services = [...this.tenants.values()].map(({ composition }) =>
            composition.service.stop(),
        );

        await Promise.all(services);
        this.tenants.clear();

        logStructured("INFO", "executive.production.stopped", {
            executionAuthority: "V6",
        });
    }

    private async refreshTenants(): Promise<void> {
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
            intervalMs: EXECUTIVE_INTERVAL_MS,
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
