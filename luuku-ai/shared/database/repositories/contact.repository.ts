import { prisma } from "../client";
import { Contact } from "../../domain/contact";
import { ContactMapper } from "../mappers/contact.mapper";
import { BaseRepository } from "./base.repository";

export class ContactRepository extends BaseRepository<Contact> {
    async findAll(companyId?: string): Promise<Contact[]> {
        const contacts = await prisma.contact.findMany({
            where: companyId ? { companyId } : undefined,
            orderBy: { createdAt: "asc" }
        });
        return contacts.map(ContactMapper.toDomain);
    }

    async findById(id: string, companyId?: string): Promise<Contact | null> {
        const contact = companyId
            ? await prisma.contact.findFirst({ where: { id, companyId } })
            : await prisma.contact.findUnique({ where: { id } });

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

    async create(contact: Contact, companyId?: string): Promise<Contact> {
        if (companyId && contact.companyId !== companyId) {
            throw new Error("CONTACT_TENANT_MISMATCH");
        }

        const created = await prisma.contact.create({
            data: ContactMapper.toPersistence(contact)
        });
        return ContactMapper.toDomain(created);
    }

    async update(contact: Contact, companyId?: string): Promise<Contact> {
        if (companyId) {
            const owned = await prisma.contact.findFirst({
                where: { id: contact.id, companyId },
                select: { id: true }
            });
            if (!owned) throw new Error("CONTACT_NOT_FOUND_OR_UNAUTHORIZED");
        }

        const updated = await prisma.contact.update({
            where: { id: contact.id },
            data: ContactMapper.toPersistence(contact)
        });
        return ContactMapper.toDomain(updated);
    }

    async delete(id: string, companyId?: string): Promise<void> {
        if (companyId) {
            const owned = await prisma.contact.findFirst({
                where: { id, companyId },
                select: { id: true }
            });
            if (!owned) throw new Error("CONTACT_NOT_FOUND_OR_UNAUTHORIZED");
        }

        await prisma.contact.delete({ where: { id } });
    }
}

export const contactRepository = new ContactRepository();
