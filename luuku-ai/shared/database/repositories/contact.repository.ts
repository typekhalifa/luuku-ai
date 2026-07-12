import { prisma } from "../client";

import { Contact } from "../../domain/contact";

import { ContactMapper } from "../mappers/contact.mapper";

import { BaseRepository } from "./base.repository";

export class ContactRepository
    extends BaseRepository<Contact> {

    async findAll(): Promise<Contact[]> {

        const contacts =
            await prisma.contact.findMany({

                orderBy: {

                    createdAt: "asc"

                }

            });

        return contacts.map(

            ContactMapper.toDomain

        );

    }

    async findById(

        id: string

    ): Promise<Contact | null> {

        const contact =
            await prisma.contact.findUnique({

                where: {

                    id

                }

            });

        if (!contact) {

            return null;

        }

        return ContactMapper.toDomain(

            contact

        );

    }

    async findByCompany(

        companyId: string

    ): Promise<Contact[]> {

        const contacts =
            await prisma.contact.findMany({

                where: {

                    companyId

                },

                orderBy: {

                    createdAt: "asc"

                }

            });

        return contacts.map(

            ContactMapper.toDomain

        );

    }

    async create(

        contact: Contact

    ): Promise<Contact> {

        const created =
            await prisma.contact.create({

                data:

                    ContactMapper.toPersistence(

                        contact

                    )

            });

        return ContactMapper.toDomain(

            created

        );

    }

    async update(

        contact: Contact

    ): Promise<Contact> {

        const updated =
            await prisma.contact.update({

                where: {

                    id: contact.id

                },

                data:

                    ContactMapper.toPersistence(

                        contact

                    )

            });

        return ContactMapper.toDomain(

            updated

        );

    }

    async delete(

        id: string

    ): Promise<void> {

        await prisma.contact.delete({

            where: {

                id

            }

        });

    }

}

export const contactRepository =
    new ContactRepository();