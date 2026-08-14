import {
    CommunicationAdapter,
    CommunicationExecutionResult,
    CommunicationRequest,
} from "./types";

import { placeVoiceCall } from "../voice/call";

function blockedResult(
    request: CommunicationRequest,
    summary: string,
    error: string,
): CommunicationExecutionResult {
    return {
        capability: request.capability,
        channel: request.channel,
        status: "blocked",
        executed: false,
        verified: false,
        summary,
        error,
    };
}

function metadataString(
    request: CommunicationRequest,
    key: string,
): string | undefined {
    const value = request.metadata?.[key];
    return typeof value === "string" ? value : undefined;
}

export const voiceAdapter: CommunicationAdapter = {
    capability: "voice.call",
    channel: "voice",

    isAvailable(): boolean {
        // The adapter is intentionally available in simulation mode until a
        // real voice provider is connected. The execution result remains
        // `simulated`, so Reality Integrity prevents CRM from treating it as
        // a real external call.
        return true;
    },

    async execute(
        request: CommunicationRequest,
    ): Promise<CommunicationExecutionResult> {
        const phoneNumber =
            request.recipient ||
            request.recipientExternalId;

        if (!phoneNumber) {
            return blockedResult(
                request,
                "Voice call recipient is missing.",
                "VOICE_RECIPIENT_MISSING",
            );
        }

        const contactName =
            metadataString(request, "contactName") || "Unknown contact";
        const company =
            metadataString(request, "company") || "Unknown company";
        const purpose =
            request.body ||
            metadataString(request, "purpose") ||
            "Business follow-up";
        const language =
            metadataString(request, "language") || "English";
        const tone =
            metadataString(request, "tone") as
                | "professional"
                | "friendly"
                | "formal"
                | undefined;

        if (!tone) {
            return blockedResult(
                request,
                "Voice call tone is missing.",
                "VOICE_TONE_MISSING",
            );
        }

        try {
            const result = await placeVoiceCall({
                contactName,
                company,
                phoneNumber,
                purpose,
                language,
                tone,
            });

            return {
                capability: request.capability,
                channel: request.channel,
                status: result.status,
                executed: result.executed,
                verified: result.verified,
                evidence: result.evidence,
                summary: result.summary,
                error:
                    result.status === "failed"
                        ? "VOICE_PROVIDER_EXECUTION_FAILED"
                        : undefined,
            };
        } catch (error) {
            return {
                capability: request.capability,
                channel: request.channel,
                status: "failed",
                executed: false,
                verified: false,
                summary: "Voice execution failed before provider confirmation.",
                error:
                    error instanceof Error ? error.message : String(error),
            };
        }
    },
};
