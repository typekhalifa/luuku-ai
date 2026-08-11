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

        success: false,

        status: "simulated",

        executed: false,

        verified: false,

        transcript: "",

        summary:
            "Call simulation completed. Real voice execution is not connected yet.",

        durationSeconds: 0

    };

}