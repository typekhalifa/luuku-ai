export type CompanyStateDomain =
    | "OBJECTIVES"
    | "WORK"
    | "SALES"
    | "CUSTOMERS"
    | "FINANCE"
    | "OPERATIONS"
    | "AGENTS"
    | "SYSTEM"
    | "DEADLINES"
    | "OPPORTUNITIES"
    | "RISKS"
    | "EXTERNAL_EVENTS";

export type CompanyStateSeverity = "INFO" | "ATTENTION" | "CRITICAL";

export interface CompanyStateValue {
    readonly domain: CompanyStateDomain;
    readonly key: string;
    readonly value: unknown;
    readonly observedAt: Date;
    readonly source: string;
}

export interface CompanyStateSnapshot {
    readonly observedAt: Date;
    readonly values: readonly CompanyStateValue[];
}

export interface CompanyStateChange {
    readonly domain: CompanyStateDomain;
    readonly key: string;
    readonly type: "ADDED" | "CHANGED" | "REMOVED";
    readonly previousValue?: unknown;
    readonly currentValue?: unknown;
    readonly significance: CompanyStateSeverity;
    readonly reason: string;
}

export interface CompanyStateObservation {
    readonly id: string;
    readonly domain: CompanyStateDomain;
    readonly key: string;
    readonly significance: CompanyStateSeverity;
    readonly message: string;
    readonly evidence: Readonly<Record<string, unknown>>;
}

export interface CompanyStateObservationResult {
    readonly snapshot: CompanyStateSnapshot;
    readonly changes: readonly CompanyStateChange[];
    readonly observations: readonly CompanyStateObservation[];
    readonly interventionRequired: boolean;
}

export interface CompanyStateObservationSource {
    readonly source: string;
    readonly observe: () => Promise<readonly CompanyStateValue[]> | readonly CompanyStateValue[];
}

export interface CompanyStateObservationOptions {
    readonly criticalDomains?: readonly CompanyStateDomain[];
    readonly attentionDomains?: readonly CompanyStateDomain[];
}

/**
 * V8-I company-state boundary. It aggregates authoritative observations,
 * compares them with the previous snapshot, and identifies meaningful change.
 * It never plans, approves, allocates resources, or executes work.
 */
export class ExecutiveCompanyStateObserver {
    private readonly criticalDomains: ReadonlySet<CompanyStateDomain>;
    private readonly attentionDomains: ReadonlySet<CompanyStateDomain>;

    constructor(
        private readonly sources: readonly CompanyStateObservationSource[],
        options: CompanyStateObservationOptions = {},
    ) {
        this.criticalDomains = new Set(options.criticalDomains ?? ["RISKS", "SYSTEM"]);
        this.attentionDomains = new Set(options.attentionDomains ?? ["SALES", "FINANCE", "DEADLINES", "OPPORTUNITIES", "CUSTOMERS", "OPERATIONS"]);
    }

    async observe(previous?: CompanyStateSnapshot): Promise<CompanyStateObservationResult> {
        const observedAt = new Date();
        const values: CompanyStateValue[] = [];

        for (const source of this.sources) {
            const sourceValues = await source.observe();
            for (const value of sourceValues) {
                if (value.source !== source.source) {
                    throw new Error(`Company state source mismatch: expected ${source.source}, received ${value.source}.`);
                }
                values.push({ ...value, observedAt });
            }
        }

        const snapshot: CompanyStateSnapshot = { observedAt, values };
        const changes = this.detectChanges(previous, snapshot);
        const observations = changes.map((change) => this.toObservation(change));

        return {
            snapshot,
            changes,
            observations,
            interventionRequired: observations.some((item) => item.significance !== "INFO"),
        };
    }

    private detectChanges(previous: CompanyStateSnapshot | undefined, current: CompanyStateSnapshot): CompanyStateChange[] {
        if (!previous) {
            return current.values.map((value) => ({
                domain: value.domain,
                key: value.key,
                type: "ADDED",
                currentValue: value.value,
                significance: this.significance(value.domain),
                reason: "Company state has been observed for the first time.",
            }));
        }

        const previousMap = new Map(previous.values.map((value) => [`${value.domain}:${value.key}`, value]));
        const currentMap = new Map(current.values.map((value) => [`${value.domain}:${value.key}`, value]));
        const changes: CompanyStateChange[] = [];

        for (const value of current.values) {
            const id = `${value.domain}:${value.key}`;
            const prior = previousMap.get(id);
            if (!prior) {
                changes.push({ domain: value.domain, key: value.key, type: "ADDED", currentValue: value.value, significance: this.significance(value.domain), reason: "A new company-state signal appeared." });
            } else if (!this.equal(prior.value, value.value)) {
                changes.push({ domain: value.domain, key: value.key, type: "CHANGED", previousValue: prior.value, currentValue: value.value, significance: this.significance(value.domain), reason: "An observed company-state signal changed." });
            }
        }

        for (const value of previous.values) {
            const id = `${value.domain}:${value.key}`;
            if (!currentMap.has(id)) {
                changes.push({ domain: value.domain, key: value.key, type: "REMOVED", previousValue: value.value, significance: this.significance(value.domain), reason: "A previously observed company-state signal disappeared." });
            }
        }

        return changes;
    }

    private significance(domain: CompanyStateDomain): CompanyStateSeverity {
        if (this.criticalDomains.has(domain)) return "CRITICAL";
        if (this.attentionDomains.has(domain)) return "ATTENTION";
        return "INFO";
    }

    private toObservation(change: CompanyStateChange): CompanyStateObservation {
        return {
            id: `company-state:${change.domain.toLowerCase()}:${change.key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            domain: change.domain,
            key: change.key,
            significance: change.significance,
            message: `${change.domain} signal '${change.key}' ${change.type.toLowerCase()}.`,
            evidence: {
                changeType: change.type,
                previousValue: change.previousValue,
                currentValue: change.currentValue,
                reason: change.reason,
            },
        };
    }

    private equal(left: unknown, right: unknown): boolean {
        return JSON.stringify(left) === JSON.stringify(right);
    }
}
