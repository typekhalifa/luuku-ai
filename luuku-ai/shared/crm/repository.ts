import { Contact } from "./types";

import {

    getContacts,

    findContactByCompany,

    updateContact

} from "./contacts";

export function getCRMContacts(): Contact[] {

    return getContacts();

}

export function findCRMContact(

    company: string

): Contact | undefined {

    return findContactByCompany(

        company

    );

}

export function saveCRMContact(

    contact: Contact

): void {

    updateContact(

        contact

    );

}