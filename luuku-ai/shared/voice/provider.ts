import {

    VoiceCallRequest,

    VoiceCallResult

} from "./types";

export interface VoiceProvider {

    placeCall(

        request: VoiceCallRequest

    ): Promise<VoiceCallResult>;

}