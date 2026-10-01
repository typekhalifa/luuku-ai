import {
    VoiceCallRequest,
    VoiceCallResult
} from "./types";

export interface VoiceProvider {
    name: string;

    isAvailable(): boolean;

    placeCall(
        request: VoiceCallRequest
    ): Promise<VoiceCallResult>;
}
