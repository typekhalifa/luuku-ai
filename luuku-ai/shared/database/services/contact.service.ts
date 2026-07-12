import { Contact } from "../../domain/contact";

import { contactRepository } from "../repositories/contact.repository";

export class ContactService {

    async getContacts(): Promise<Contact[]> {

        return contactRepository.findAll();

    }

    async getContact(

        id: string

    ): Promise<Contact | null> {

        return contactRepository.findById(

            id

        );

    }

    async getCompanyContacts(

        companyId: string

    ): Promise<Contact[]> {

        return contactRepository.findByCompany(

            companyId

        );

    }

    async createContact(

        contact: Contact

    ): Promise<Contact> {

        return contactRepository.create(

            contact

        );

    }

    async updateContact(

        contact: Contact

    ): Promise<Contact> {

        return contactRepository.update(

            contact

        );

    }

    async deleteContact(

        id: string

    ): Promise<void> {

        await contactRepository.delete(

            id

        );

    }

}

export const contactService =
    new ContactService();