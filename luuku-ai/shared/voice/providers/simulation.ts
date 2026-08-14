import crypto from "crypto";

import {
    VoiceCallRequest,
    VoiceCallResult
} from "../types";

import {
    VoiceProvider
} from "../provider";

export const simulationVoiceProvider: VoiceProvider = {
    name: "simulation",

    isAvailable(): boolean {
        return true;
    },

    async placeCall(
        request: VoiceCallRequest
    ): Promise<VoiceCallResult> {
        const simulationId = crypto.randomUUID();

        console.log("");
        console.log("========================================");
        console.log("       SIMULATED VOICE PROVIDER");
        console.log("========================================");
        console.log("");
        console.log(`Recipient : ${request.phoneNumber}`);
        console.log(`Contact   : ${request.contactName}`);
        console.log(`Company   : ${request.company}`);
        console.log(`Purpose   : ${request.purpose}`);
        console.log(`Language  : ${request.language}`);
        console.log(`Tone      : ${request.tone}`);
        console.log("");
        console.log("No external phone call was made.");

        return {
            success: false,
            status: "simulated",
            executed: false,
            verified: false,
            transcript: "",
            summary:
                "Voice call simulation completed. No external phone call was made.",
            durationSeconds: 0,
            evidence: {
                provider: "simulation",
                externalId: simulationId,
                details: {
                    recipient: request.phoneNumber,
                    simulation: true
                }
            }
        };
    }
};
