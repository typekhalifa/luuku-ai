import { Contact } from "./types";

export type CRMCommunicationChannel =
    | "email"
    | "voice"
    | undefined;

export interface CRMValidationResult {

    ready: boolean;

    reasons: string[];

}

export function validateContact(

    contact: Contact,
    channel?: CRMCommunicationChannel

): CRMValidationResult {

    const reasons: string[] = [];

    // CRM readiness is channel-aware. An email action does not require a
    // phone number, while a voice action does not require an email address.
    if (
        (!channel || channel === "voice") &&
        !contact.phoneNumber
    ) {
        reasons.push(
            "Missing phone number."
        );
    }

    if (
        (!channel || channel === "email") &&
        !contact.email
    ) {
        reasons.push(
            "Missing email address."
        );
    }

    if (!contact.verified) {
        reasons.push(
            "Contact is not verified."
        );
    }

    return {

        ready:

            reasons.length === 0,

        reasons

    };
}
