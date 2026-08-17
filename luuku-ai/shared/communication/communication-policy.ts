import {
    CommunicationRequest,
} from "./types";

import {
    CommunicationIdentityResolver,
    IdentityResolutionResult,
} from "./identity-resolver";

export type CommunicationPolicyDecision =
    | "allow"
    | "review"
    | "block";

export type CommunicationAudience =
    | "internal"
    | "external";

export type CommunicationExecutionMode =
    | "live"
    | "test"
    | "simulation";

export interface CommunicationPolicyResult {
    decision: CommunicationPolicyDecision;
    reason: string;
    errorCode?: string;
    identityResolution?: IdentityResolutionResult;
}

interface CommunicationPolicyMetadata {
    audience?: CommunicationAudience;
    executionMode?: CommunicationExecutionMode;
}

function readMetadata(
    request: CommunicationRequest,
): CommunicationPolicyMetadata {
    const metadata = request.metadata ?? {};

    const audience =
        metadata.audience === "internal" ||
        metadata.audience === "external"
            ? metadata.audience
            : undefined;

    const executionMode =
        metadata.executionMode === "live" ||
        metadata.executionMode === "test" ||
        metadata.executionMode === "simulation"
            ? metadata.executionMode
            : undefined;

    return {
        audience,
        executionMode,
    };
}

function recipientExternalId(
    request: CommunicationRequest,
): string | undefined {
    const value =
        request.recipientExternalId ||
        request.recipient;

    return typeof value === "string" && value.trim()
        ? value.trim()
        : undefined;
}

export class CommunicationPolicy {
    constructor(
        private readonly identityResolver =
            new CommunicationIdentityResolver(),
    ) {}

    async evaluate(
        request: CommunicationRequest,
    ): Promise<CommunicationPolicyResult> {
        const metadata = readMetadata(request);

        if (metadata.executionMode === "simulation") {
            return {
                decision: "block",
                reason:
                    "Simulation mode must never execute an external communication.",
                errorCode:
                    "COMMUNICATION_SIMULATION_BLOCKED",
            };
        }

        if (metadata.audience === "internal") {
            return {
                decision: "allow",
                reason:
                    "Internal communication does not require external prospect identity resolution.",
            };
        }

        if (metadata.audience !== "external") {
            return {
                decision: "block",
                reason:
                    "Communication audience must be explicitly classified as internal or external.",
                errorCode:
                    "COMMUNICATION_AUDIENCE_MISSING",
            };
        }

        const externalId = recipientExternalId(request);

        if (!externalId) {
            return {
                decision: "block",
                reason:
                    "External communication requires a recipient identity.",
                errorCode:
                    "COMMUNICATION_RECIPIENT_IDENTITY_MISSING",
            };
        }

        const identityResolution =
            await this.identityResolver.resolve({
                channel: request.channel,
                externalId,
            });

        if (
            identityResolution.requiresReview ||
            identityResolution.status === "ambiguous"
        ) {
            return {
                decision: "review",
                reason:
                    "Recipient identity is ambiguous or requires review before external communication.",
                errorCode:
                    "COMMUNICATION_IDENTITY_REVIEW_REQUIRED",
                identityResolution,
            };
        }

        if (identityResolution.status !== "resolved") {
            return {
                decision: "block",
                reason:
                    "External communication requires a resolved CRM recipient identity.",
                errorCode:
                    "COMMUNICATION_IDENTITY_NOT_RESOLVED",
                identityResolution,
            };
        }

        return {
            decision: "allow",
            reason:
                "External recipient identity is resolved and communication is permitted.",
            identityResolution,
        };
    }
}

export const communicationPolicy =
    new CommunicationPolicy();
