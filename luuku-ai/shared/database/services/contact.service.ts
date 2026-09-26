import { Contact } from "../../domain/contact";

import { contactRepository } from "../repositories/contact.repository";

export class ContactService {
    async getContacts(companyId: string): Promise<Contact[]> {
        return contactRepository.findAll(companyId);
    }

    async getContactsSystem(): Promise<Contact[]> {
        return contactRepository.findAll();
    }

    async getContact(id: string, companyId: string): Promise<Contact | null> {
        return contactRepository.findById(id, companyId);
    }

    async getContactSystem(id: string): Promise<Contact | null> {
        return contactRepository.findById(id);
    }

    async getCompanyContacts(companyId: string, requesterCompanyId: string): Promise<Contact[]> {
        if (companyId !== requesterCompanyId) {
            throw new Error("COMPANY_TENANT_MISMATCH");
        }
        return contactRepository.findByCompany(companyId);
    }

    async getCompanyContactsSystem(companyId: string): Promise<Contact[]> {
        return contactRepository.findByCompany(companyId);
    }

    async createContact(contact: Contact, companyId: string): Promise<Contact> {
        return contactRepository.create(contact, companyId);
    }

    async createContactSystem(contact: Contact): Promise<Contact> {
        return contactRepository.create(contact);
    }

    async updateContact(contact: Contact, companyId: string): Promise<Contact> {
        return contactRepository.update(contact, companyId);
    }

    async updateContactSystem(contact: Contact): Promise<Contact> {
        return contactRepository.update(contact);
    }

    async deleteContact(id: string, companyId: string): Promise<void> {
        await contactRepository.delete(id, companyId);
    }

    async deleteContactSystem(id: string): Promise<void> {
        await contactRepository.delete(id);
    }
}

export const contactService = new ContactService();
