import {

    VoiceCallRequest,

    VoiceCallResult

} from "./types";

export async function placeVoiceCall(

    request: VoiceCallRequest

): Promise<VoiceCallResult> {

    console.log("");

    console.log("========================================");

    console.log("        VOICE CALL");

    console.log("========================================");

    console.log("");

    console.log(request);

    return {

        success: true,

        transcript: "",

        summary: "Call simulation completed.",

        durationSeconds: 0

    };

}