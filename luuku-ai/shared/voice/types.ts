export interface VoiceCallRequest {

    contactName: string;

    company: string;

    phoneNumber: string;

    purpose: string;

    language: string;

    tone:
        | "professional"
        | "friendly"
        | "formal";

}

export interface VoiceCallResult {

    success: boolean;

    transcript: string;

    summary: string;

    durationSeconds: number;

}