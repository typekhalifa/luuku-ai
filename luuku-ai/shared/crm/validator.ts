import { Contact } from "./types";

export interface CRMValidationResult {

    ready: boolean;

    reasons: string[];

}

export function validateContact(

    contact: Contact

): CRMValidationResult {

    const reasons: string[] = [];

    if (!contact.phoneNumber) {

        reasons.push(

            "Missing phone number."

        );

    }

    if (!contact.email) {

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