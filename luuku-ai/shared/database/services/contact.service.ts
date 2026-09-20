import { Contact } from "../../domain/contact";

import { contactRepository } from "../repositories/contact.repository";

export class ContactService {
    async getContacts(companyId?: string): Promise<Contact[]> {
        return contactRepository.findAll(companyId);
    }

    async getContact(id: string, companyId?: string): Promise<Contact | null> {
        return contactRepository.findById(id, companyId);
    }

    async getCompanyContacts(companyId: string, requesterCompanyId?: string): Promise<Contact[]> {
        if (requesterCompanyId && companyId !== requesterCompanyId) {
            throw new Error("COMPANY_TENANT_MISMATCH");
        }
        return contactRepository.findByCompany(companyId);
    }

    async createContact(contact: Contact, companyId?: string): Promise<Contact> {
        return contactRepository.create(contact, companyId);
    }

    async updateContact(contact: Contact, companyId?: string): Promise<Contact> {
        return contactRepository.update(contact, companyId);
    }

    async deleteContact(id: string, companyId?: string): Promise<void> {
        await contactRepository.delete(id, companyId);
    }
}

export const contactService = new ContactService();
