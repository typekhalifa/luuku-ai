import { Contact } from "./types";
import { loadCollection, saveCollection } from "./persistent-store";

const seedContacts: Contact[] = [
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
        source: "Seed Data",
    },
];

let contacts: Contact[] = loadCollection<Contact>("contacts", seedContacts);

export function getContacts(): Contact[] {
    contacts = loadCollection<Contact>("contacts", seedContacts);
    return contacts;
}

export function findContactByCompany(company: string): Contact | undefined {
    return getContacts().find(
        (contact) => contact.company.toLowerCase() === company.toLowerCase(),
    );
}

export function updateContact(updated: Contact): void {
    const current = getContacts();
    const index = current.findIndex(
        (contact) => contact.company.toLowerCase() === updated.company.toLowerCase(),
    );

    contacts =
        index >= 0
            ? current.map((contact, currentIndex) =>
                  currentIndex === index ? { ...contact, ...updated } : contact,
              )
            : [...current, updated];

    saveCollection("contacts", contacts);
}
