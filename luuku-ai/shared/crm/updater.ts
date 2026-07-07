import { Contact } from "./types";

import {

    findCRMContact,

    saveCRMContact

} from "./repository";

export interface CRMUpdateResult {

    success: boolean;

    summary: string;

    contact: Contact;

}

export function updateCRMContact(

    contact: Contact

): CRMUpdateResult {

    saveCRMContact(

        contact

    );

    return {

        success: true,

        summary:

            `${contact.company} contact updated successfully.`,

        contact

    };

}

export function markContactVerified(

    company: string,

    updates: Partial<Contact>

): CRMUpdateResult {

    const existing =

        findCRMContact(

            company

        );

    if (!existing) {

        throw new Error(

            `Contact for "${company}" not found.`

        );

    }

    const updated: Contact = {

        ...existing,

        ...updates,

        verified: true,

        lastVerifiedAt:

            new Date().toISOString()

    };

    saveCRMContact(

        updated

    );

    return {

        success: true,

        summary:

            `${company} contact verified.`,

        contact: updated

    };

}