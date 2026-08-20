import {
    CommunicationRequest,
    CommunicationTarget,
} from "./types";

import {
    CommunicationIdentityResolver,
    IdentityResolutionResult,
} from "./identity-resolver";

import {
    getAgentPresence,
} from "../agents/registry";

import {
    canCommunicate,
} from "./agent-presence";

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

function targetForRequest(
    request: CommunicationRequest,
): CommunicationTarget | undefined {
    return request.target;
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

        if (request.requesterAgentId) {
            const presence =
                getAgentPresence(request.requesterAgentId);

            if (!presence) {
                return {
                    decision: "block",
                    reason:
                        `Requester agent ${request.requesterAgentId} has no registered communication presence.`,
                    errorCode:
                        "COMMUNICATION_REQUESTER_PRESENCE_MISSING",
                };
            }

            const target = targetForRequest(request);

            if (!target) {
                return {
                    decision: "block",
                    reason:
                        "Agent-originated communication requires an explicit target.",
                    errorCode:
                        "COMMUNICATION_TARGET_MISSING",
                };
            }

            if (target === "agent" && !request.targetAgentId) {
                return {
                    decision: "block",
                    reason:
                        "Agent-to-agent communication requires a target agent id.",
                    errorCode:
                        "COMMUNICATION_TARGET_AGENT_MISSING",
                };
            }

            if (!canCommunicate(presence, target)) {
                return {
                    decision: "block",
                    reason:
                        `Agent ${presence.id} is not permitted to communicate with ${target}.`,
                    errorCode:
                        "COMMUNICATION_AGENT_SCOPE_BLOCKED",
                };
            }

            if (
                target === "agent" &&
                request.targetAgentId === request.requesterAgentId
            ) {
                return {
                    decision: "block",
                    reason:
                        "An agent cannot address itself as another agent.",
                    errorCode:
                        "COMMUNICATION_SELF_TARGET_BLOCKED",
                };
            }

            if (target === "agent" && request.targetAgentId) {
                const targetPresence =
                    getAgentPresence(request.targetAgentId);

                if (!targetPresence) {
                    return {
                        decision: "block",
                        reason:
                            `Target agent ${request.targetAgentId} has no registered communication presence.`,
                        errorCode:
                            "COMMUNICATION_TARGET_PRESENCE_MISSING",
                    };
                }

                if (
                    presence.scope.allowedTargetDepartments?.length &&
                    !presence.scope.allowedTargetDepartments.includes(
                        targetPresence.department,
                    )
                ) {
                    return {
                        decision: "block",
                        reason:
                            `Agent ${presence.id} is not permitted to communicate with the ${targetPresence.department} department.`,
                        errorCode:
                            "COMMUNICATION_TARGET_DEPARTMENT_BLOCKED",
                    };
                }
            }
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

        // Test mode is deliberately allowed to resolve the real CRM recipient
        // so the full identity path can be exercised, but it must never reach
        // an external provider. Live execution requires an explicit live mode.
        if (metadata.executionMode === "test") {
            return {
                decision: "block",
                reason:
                    "Test mode resolved the CRM recipient but external communication execution is disabled.",
                errorCode:
                    "COMMUNICATION_TEST_MODE_BLOCKED",
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
