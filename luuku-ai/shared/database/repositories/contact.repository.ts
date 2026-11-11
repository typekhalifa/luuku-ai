import { prisma } from "../client";
import { Contact } from "../../domain/contact";
import { ContactMapper } from "../mappers/contact.mapper";
export class ContactRepository {
    async findAll(companyId: string): Promise<Contact[]> {
        const contacts = await prisma.contact.findMany({
            where: { companyId },
            orderBy: { createdAt: "asc" }
        });
        return contacts.map(ContactMapper.toDomain);
    }

    async findAllSystem(): Promise<Contact[]> {
        const contacts = await prisma.contact.findMany({
            orderBy: { createdAt: "asc" }
        });
        return contacts.map(ContactMapper.toDomain);
    }

    async findById(id: string, companyId: string): Promise<Contact | null> {
        const contact = await prisma.contact.findFirst({
            where: { id, companyId }
        });

        if (!contact) return null;
        return ContactMapper.toDomain(contact);
    }

    async findByIdSystem(id: string): Promise<Contact | null> {
        const contact = await prisma.contact.findUnique({ where: { id } });

        if (!contact) return null;
        return ContactMapper.toDomain(contact);
    }

    async findByCompany(companyId: string): Promise<Contact[]> {
        const contacts = await prisma.contact.findMany({
            where: { companyId },
            orderBy: { createdAt: "asc" }
        });
        return contacts.map(ContactMapper.toDomain);
    }

    async create(contact: Contact, companyId: string): Promise<Contact> {
        if (contact.companyId !== companyId) {
            throw new Error("CONTACT_TENANT_MISMATCH");
        }

        if (contact.prospectId) {
            const prospect = await prisma.prospect.findFirst({
                where: { id: contact.prospectId, tenantCompanyId: companyId },
                select: { id: true },
            });
            if (!prospect) throw new Error("PROSPECT_TENANT_MISMATCH");
        }

        const created = await prisma.contact.create({
            data: ContactMapper.toPersistence(contact)
        });
        return ContactMapper.toDomain(created);
    }

    async createSystem(contact: Contact): Promise<Contact> {
        const created = await prisma.contact.create({
            data: ContactMapper.toPersistence(contact)
        });
        return ContactMapper.toDomain(created);
    }

    async update(contact: Contact, companyId: string): Promise<Contact> {
        if (contact.companyId !== companyId) {
            throw new Error("CONTACT_TENANT_MISMATCH");
        }

        const owned = await prisma.contact.findFirst({
            where: { id: contact.id, companyId },
            select: { id: true }
        });
        if (!owned) throw new Error("CONTACT_NOT_FOUND_OR_UNAUTHORIZED");

        if (contact.prospectId) {
            const prospect = await prisma.prospect.findFirst({
                where: { id: contact.prospectId, tenantCompanyId: companyId },
                select: { id: true },
            });
            if (!prospect) throw new Error("PROSPECT_TENANT_MISMATCH");
        }

        const updated = await prisma.contact.update({
            where: { id: contact.id },
            data: ContactMapper.toPersistence(contact)
        });
        return ContactMapper.toDomain(updated);
    }

    async updateSystem(contact: Contact): Promise<Contact> {
        const updated = await prisma.contact.update({
            where: { id: contact.id },
            data: ContactMapper.toPersistence(contact)
        });
        return ContactMapper.toDomain(updated);
    }

    async delete(id: string, companyId: string): Promise<void> {
        const owned = await prisma.contact.findFirst({
            where: { id, companyId },
            select: { id: true }
        });
        if (!owned) throw new Error("CONTACT_NOT_FOUND_OR_UNAUTHORIZED");

        await prisma.contact.delete({ where: { id } });
    }

    async deleteSystem(id: string): Promise<void> {
        await prisma.contact.delete({ where: { id } });
    }
}

export const contactRepository = new ContactRepository();
