import {
    VoiceCallRequest,
    VoiceCallResult
} from "./types";

import {
    VoiceProvider
} from "./provider";

import {
    simulationVoiceProvider
} from "./providers/simulation";

import {
    elevenLabsTwilioProvider
} from "./providers/elevenlabs-twilio";

function getVoiceMode(): "simulation" | "live" {
    return process.env.VOICE_MODE?.trim().toLowerCase() === "live"
        ? "live"
        : "simulation";
}

function getProvider(): VoiceProvider {
    if (getVoiceMode() === "live") {
        return elevenLabsTwilioProvider;
    }

    return simulationVoiceProvider;
}

export function getVoiceProviderStatus(): {
    mode: "simulation" | "live";
    provider: string;
    available: boolean;
} {
    const provider = getProvider();

    return {
        mode: getVoiceMode(),
        provider: provider.name,
        available: provider.isAvailable()
    };
}

export async function placeVoiceCall(
    request: VoiceCallRequest
): Promise<VoiceCallResult> {
    const mode = getVoiceMode();
    const provider = getProvider();

    console.log("");
    console.log("========================================");
    console.log("        VOICE CALL EXECUTION");
    console.log("========================================");
    console.log("");
    console.log(`Mode     : ${mode}`);
    console.log(`Provider : ${provider.name}`);
    console.log(`Recipient: ${request.phoneNumber}`);

    if (!provider.isAvailable()) {
        return {
            success: false,
            status: "blocked",
            executed: false,
            verified: false,
            transcript: "",
            summary:
                mode === "live"
                    ? "Live voice provider is unavailable because the required ElevenLabs configuration is incomplete."
                    : "Voice simulation provider is unavailable.",
            durationSeconds: 0,
            evidence: {
                provider: provider.name
            }
        };
    }

    return provider.placeCall(request);
}
