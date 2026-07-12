import { Contact } from "../../domain/contact";
import { Contact as PrismaContact } from "@prisma/client";

export class ContactMapper {

    static toDomain(
        contact: PrismaContact
    ): Contact {

        return {

            id: contact.id,

            companyId: contact.companyId,

            name: contact.name,

            email: contact.email ?? undefined,

            phoneNumber:
                contact.phoneNumber ?? undefined,

            preferredLanguage:
                contact.preferredLanguage ?? undefined,

            department:
                contact.department ?? undefined,

            position:
                contact.position ?? undefined,

            verified:
                contact.verified,

            confidence:
                contact.confidence,

            source:
                contact.source,

            lastVerifiedAt:
                contact.lastVerifiedAt
                    ?.toISOString(),

            createdAt:
                contact.createdAt
                    .toISOString(),

            updatedAt:
                contact.updatedAt
                    .toISOString()

        };

    }

    static toPersistence(
        contact: Contact
    ) {

        return {

            id: contact.id,

            companyId:
                contact.companyId,

            name:
                contact.name,

            email:
                contact.email,

            phoneNumber:
                contact.phoneNumber,

            preferredLanguage:
                contact.preferredLanguage,

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
                    ? new Date(
                        contact.lastVerifiedAt
                    )
                    : null

        };

    }

}