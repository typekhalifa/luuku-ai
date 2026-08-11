import {
    Contact
} from "./types";

import {
    contactService
} from "../database/services/contact.service";

import {
    companyService
} from "../database/services/company.service";

export async function resolveContact(
    companyName: string,
    preferredEmail?: string
): Promise<Contact | undefined> {

    const company =
        await companyService.findCompany(
            companyName
        );

    if (!company) {
        return undefined;
    }

    const contacts =
        await contactService.getCompanyContacts(
            company.id
        );

    const contact = preferredEmail
        ? contacts.find(
            item =>
                item.email?.toLowerCase() ===
                preferredEmail.toLowerCase()
        ) || contacts[0]
        : contacts[0];

    if (!contact) {
        return undefined;
    }

    return {

        id:
            contact.id,

        name:
            contact.name,

        company:
            company.name,

        phoneNumber:
            contact.phoneNumber,

        email:
            contact.email,

        preferredLanguage:
            contact.preferredLanguage ?? "English",

        department:
            contact.department,

        position:
            contact.position,

        verified:
            contact.verified,

        confidence:
            contact.confidence,

        source:
            contact.source,

        lastVerifiedAt:
            contact.lastVerifiedAt

    };

}
