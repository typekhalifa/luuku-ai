export type ExecutiveRuntimeState =
    | "CREATED"
    | "STARTING"
    | "READY"
    | "DEGRADED"
    | "STOPPING"
    | "STOPPED"
    | "FAILED";

export type ExecutiveDependencyStatus = "READY" | "DEGRADED" | "FAILED";

export interface ExecutiveRuntimeDependency {
    readonly name: string;
    check(): Promise<ExecutiveDependencyStatus> | ExecutiveDependencyStatus;
}

export interface ExecutiveRuntimeLease {
    acquire(ownerId: string): Promise<boolean> | boolean;
    release(ownerId: string): Promise<void> | void;
}

export interface ExecutiveRuntimeService {
    start(): void;
    stop(): Promise<void>;
    isRunning(): boolean;
}

export interface ExecutiveProductionRuntimeOptions {
    readonly ownerId: string;
    readonly service: ExecutiveRuntimeService;
    readonly lease: ExecutiveRuntimeLease;
    readonly dependencies?: readonly ExecutiveRuntimeDependency[];
}

export interface ExecutiveProductionRuntimeHealth {
    readonly state: ExecutiveRuntimeState;
    readonly ready: boolean;
    readonly live: boolean;
    readonly dependencies: Readonly<Record<string, ExecutiveDependencyStatus>>;
    readonly ownerId: string;
}

/**
 * Operational boundary around the already-composed executive service.
 *
 * This class owns process lifecycle, dependency readiness and singleton
 * ownership. It does not execute workflows and never bypasses V6 authority.
 */
export class ExecutiveProductionRuntime {
    private state: ExecutiveRuntimeState = "CREATED";
    private ownsLease = false;
    private dependencyStatuses: Record<string, ExecutiveDependencyStatus> = {};

    constructor(private readonly options: ExecutiveProductionRuntimeOptions) {
        if (!options.ownerId.trim()) throw new Error("ownerId is required.");
    }

    getState(): ExecutiveRuntimeState {
        return this.state;
    }

    async start(): Promise<ExecutiveProductionRuntimeHealth> {
        if (this.state === "READY" || this.state === "DEGRADED") return this.health();
        if (this.state === "STARTING" || this.state === "STOPPING") {
            throw new Error(`Cannot start runtime while state is ${this.state}.`);
        }

        this.state = "STARTING";
        try {
            await this.checkDependencies();
            if (Object.values(this.dependencyStatuses).some((status) => status === "FAILED")) {
                this.state = "FAILED";
                return this.health();
            }

            this.ownsLease = await this.options.lease.acquire(this.options.ownerId);
            if (!this.ownsLease) {
                this.state = "FAILED";
                throw new Error("Executive runtime lease is already held by another owner.");
            }

            this.options.service.start();
            this.state = Object.values(this.dependencyStatuses).some((status) => status === "DEGRADED")
                ? "DEGRADED"
                : "READY";
            return this.health();
        } catch (error) {
            if (this.ownsLease) {
                await this.options.lease.release(this.options.ownerId);
                this.ownsLease = false;
            }
            if (this.state !== "FAILED") this.state = "FAILED";
            throw error;
        }
    }

    async stop(): Promise<ExecutiveProductionRuntimeHealth> {
        if (this.state === "STOPPED" || this.state === "CREATED") {
            this.state = "STOPPED";
            return this.health();
        }

        this.state = "STOPPING";
        try {
            await this.options.service.stop();
        } finally {
            if (this.ownsLease) {
                await this.options.lease.release(this.options.ownerId);
                this.ownsLease = false;
            }
            this.state = "STOPPED";
        }
        return this.health();
    }

    health(): ExecutiveProductionRuntimeHealth {
        const live = this.state !== "FAILED" && this.state !== "STOPPED";
        const ready = this.state === "READY" || this.state === "DEGRADED";
        return {
            state: this.state,
            ready,
            live,
            dependencies: { ...this.dependencyStatuses },
            ownerId: this.options.ownerId,
        };
    }

    private async checkDependencies(): Promise<void> {
        const statuses = await Promise.all(
            (this.options.dependencies ?? []).map(async (dependency) => [
                dependency.name,
                await dependency.check(),
            ] as const),
        );
        this.dependencyStatuses = Object.fromEntries(statuses);
    }
}

/** Simple process-local lease useful for tests and single-process deployments. */
export class InMemoryExecutiveRuntimeLease implements ExecutiveRuntimeLease {
    private ownerId: string | undefined;

    acquire(ownerId: string): boolean {
        if (this.ownerId && this.ownerId !== ownerId) return false;
        this.ownerId = ownerId;
        return true;
    }

    release(ownerId: string): void {
        if (this.ownerId === ownerId) this.ownerId = undefined;
    }
}
