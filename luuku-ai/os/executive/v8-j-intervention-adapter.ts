import type {
    CompanyStateObservation,
    CompanyStateObservationResult,
    CompanyStateSeverity,
} from "./v8-i-company-state-observation.js";

export type ExecutiveInterventionSignalType =
    | "RECOVER_FAILED_WORK"
    | "INVESTIGATE_RISK"
    | "INVESTIGATE_SYSTEM"
    | "INVESTIGATE_BUSINESS_CHANGE"
    | "NO_INTERVENTION";

export interface ExecutiveInterventionSignal {
    readonly id: string;
    readonly type: ExecutiveInterventionSignalType;
    readonly severity: CompanyStateSeverity;
    readonly domain: CompanyStateObservation["domain"];
    readonly key: string;
    readonly reason: string;
    readonly sourceObservationIds: readonly string[];
    readonly evidence: Readonly<Record<string, unknown>>;
}

export interface ExecutiveInterventionSignalResult {
    readonly generatedAt: Date;
    readonly signals: readonly ExecutiveInterventionSignal[];
    readonly interventionRequired: boolean;
}

/**
 * V8-J boundary between company-state awareness and executive intervention.
 * It translates meaningful V8-I observations into bounded intervention
 * signals only. It never selects an agent, creates a plan, requests approval,
 * allocates resources, or executes work.
 */
export class ExecutiveCompanyStateInterventionAdapter {
    derive(observation: CompanyStateObservationResult): ExecutiveInterventionSignalResult {
        const signals = observation.observations
            .map((item) => this.toSignal(item))
            .filter((signal): signal is ExecutiveInterventionSignal => signal !== undefined);

        return {
            generatedAt: new Date(),
            signals,
            interventionRequired: signals.some((signal) => signal.type !== "NO_INTERVENTION"),
        };
    }

    private toSignal(observation: CompanyStateObservation): ExecutiveInterventionSignal | undefined {
        if (observation.significance === "INFO") return undefined;

        const type = this.typeFor(observation);
        return {
            id: `executive-intervention:${observation.id}`,
            type,
            severity: observation.significance,
            domain: observation.domain,
            key: observation.key,
            reason: this.reasonFor(type, observation),
            sourceObservationIds: [observation.id],
            evidence: { ...observation.evidence },
        };
    }

    private typeFor(observation: CompanyStateObservation): ExecutiveInterventionSignalType {
        switch (observation.domain) {
            case "RISKS":
                return "INVESTIGATE_RISK";
            case "SYSTEM":
                return "INVESTIGATE_SYSTEM";
            case "WORK":
                return "RECOVER_FAILED_WORK";
            default:
                return "INVESTIGATE_BUSINESS_CHANGE";
        }
    }

    private reasonFor(type: ExecutiveInterventionSignalType, observation: CompanyStateObservation): string {
        switch (type) {
            case "INVESTIGATE_RISK":
                return `A ${observation.significance.toLowerCase()} risk-state change requires executive investigation.`;
            case "INVESTIGATE_SYSTEM":
                return `A ${observation.significance.toLowerCase()} system-state change requires executive investigation.`;
            case "RECOVER_FAILED_WORK":
                return "A work-state change may require recovery before normal execution continues.";
            case "INVESTIGATE_BUSINESS_CHANGE":
                return `A ${observation.domain.toLowerCase()} state change requires executive investigation.`;
            case "NO_INTERVENTION":
                return "No intervention is required.";
        }
    }
}
