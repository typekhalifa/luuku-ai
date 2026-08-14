import {
    VoiceCallRequest,
    VoiceCallResult
} from "../types";

import {
    VoiceProvider
} from "../provider";

const ELEVENLABS_OUTBOUND_URL =
    "https://api.elevenlabs.io/v1/convai/twilio/outbound-call";

interface ElevenLabsOutboundResponse {
    success?: boolean;
    message?: string;
    conversation_id?: string | null;
    callSid?: string | null;
}

function getRequiredEnv(name: string): string | undefined {
    const value = process.env[name]?.trim();
    return value || undefined;
}

function getAllowedRecipients(): string[] {
    return (process.env.VOICE_ALLOWED_RECIPIENTS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
}

function normalizePhoneNumber(value: string): string {
    return value.replace(/[\s()-]/g, "");
}

function isRecipientAllowed(phoneNumber: string): boolean {
    const allowed = getAllowedRecipients();

    if (!allowed.length) {
        return true;
    }

    const normalized = normalizePhoneNumber(phoneNumber);

    return allowed.some(
        (candidate) => normalizePhoneNumber(candidate) === normalized
    );
}

function failedResult(
    summary: string,
    error: string
): VoiceCallResult {
    return {
        success: false,
        status: "failed",
        executed: false,
        verified: false,
        transcript: "",
        summary,
        durationSeconds: 0,
        evidence: {
            provider: "elevenlabs-twilio"
        }
    };
}

export const elevenLabsTwilioProvider: VoiceProvider = {
    name: "elevenlabs-twilio",

    isAvailable(): boolean {
        return Boolean(
            getRequiredEnv("ELEVENLABS_API_KEY") &&
            getRequiredEnv("ELEVENLABS_AGENT_ID") &&
            getRequiredEnv("ELEVENLABS_AGENT_PHONE_NUMBER_ID")
        );
    },

    async placeCall(
        request: VoiceCallRequest
    ): Promise<VoiceCallResult> {
        const apiKey = getRequiredEnv("ELEVENLABS_API_KEY");
        const agentId = getRequiredEnv("ELEVENLABS_AGENT_ID");
        const agentPhoneNumberId = getRequiredEnv(
            "ELEVENLABS_AGENT_PHONE_NUMBER_ID"
        );

        if (!apiKey || !agentId || !agentPhoneNumberId) {
            return failedResult(
                "ElevenLabs voice configuration is incomplete.",
                "ELEVENLABS_CONFIGURATION_MISSING"
            );
        }

        if (!isRecipientAllowed(request.phoneNumber)) {
            return failedResult(
                "Voice recipient is not in the configured allowed-recipient list.",
                "VOICE_RECIPIENT_NOT_ALLOWED"
            );
        }

        const payload = {
            agent_id: agentId,
            agent_phone_number_id: agentPhoneNumberId,
            to_number: request.phoneNumber,
            conversation_initiation_client_data: {
                dynamic_variables: {
                    contact_name: request.contactName,
                    company: request.company,
                    purpose: request.purpose,
                    language: request.language,
                    tone: request.tone
                }
            }
        };

        const response = await fetch(
            ELEVENLABS_OUTBOUND_URL,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": apiKey
                },
                body: JSON.stringify(payload)
            }
        );

        const raw = await response.text();
        let data: ElevenLabsOutboundResponse = {};

        try {
            data = raw ? JSON.parse(raw) as ElevenLabsOutboundResponse : {};
        } catch {
            data = {};
        }

        if (!response.ok || data.success === false) {
            return failedResult(
                data.message ||
                    `ElevenLabs rejected the outbound voice call (${response.status}).`,
                `ELEVENLABS_HTTP_${response.status}`
            );
        }

        const conversationId = data.conversation_id || undefined;
        const callSid = data.callSid || undefined;

        return {
            success: true,
            status: "executing",
            executed: true,
            verified: false,
            transcript: "",
            summary:
                data.message ||
                "ElevenLabs accepted the outbound call request. Final call outcome will be verified from the conversation lifecycle.",
            durationSeconds: 0,
            evidence: {
                provider: "elevenlabs-twilio",
                externalId: callSid || conversationId,
                reference: conversationId,
                details: {
                    conversationId,
                    callSid,
                    recipient: request.phoneNumber,
                    agentId,
                    agentPhoneNumberId,
                    providerAccepted: true
                }
            }
        };
    }
};
