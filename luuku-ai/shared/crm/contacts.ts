import { Contact } from "./types";

const contacts: Contact[] = [

    {

        id: "rra-001",

        name: "Procurement Manager",

        company: "Rwanda Revenue Authority",

        phoneNumber: undefined,

        email: undefined,

        preferredLanguage: "English",

        department: "Procurement",

        position: "Manager",

        verified: false,

        confidence: 0,

        source: "Seed Data"

    }

];

export function getContacts(): Contact[] {

    return contacts;

}

export function findContactByCompany(

    company: string

): Contact | undefined {

    return contacts.find(

        contact =>

            contact.company.toLowerCase() ===

            company.toLowerCase()

    );

}

export function updateContact(

    updated: Contact

): void {

    const index = contacts.findIndex(

        contact =>

            contact.company.toLowerCase() ===

            updated.company.toLowerCase()

    );

    if (index >= 0) {

        contacts[index] = {

            ...contacts[index],

            ...updated

        };

    } else {

        contacts.push(updated);

    }

}