import crypto from "crypto";

import { Company } from "../domain/company";
import { Contact } from "../domain/contact";

import { companyService } from "../database/services/company.service";
import { contactService } from "../database/services/contact.service";

export class CRMApplication {

    async registerProspect(

        company: Omit<
            Company,
            "id" | "createdAt" | "updatedAt"
        >,

        contact?: Omit<
            Contact,
            | "id"
            | "companyId"
            | "createdAt"
            | "updatedAt"
        >

    ) {

        const now =
            new Date().toISOString();

        let targetCompany =
            await companyService.findCompany(
                company.name
            );

        if (!targetCompany) {

            targetCompany =
                await companyService.createCompany({

                    ...company,

                    id:
                        crypto.randomUUID(),

                    createdAt:
                        now,

                    updatedAt:
                        now

                });

        }

        let createdContact: Contact | null =
            null;

        if (contact) {

            createdContact =
                await contactService.createContact({

                    ...contact,

                    id:
                        crypto.randomUUID(),

                    companyId:
                        targetCompany.id,

                    createdAt:
                        now,

                    updatedAt:
                        now

                });

        }

        return {

            company:
                targetCompany,

            contact:
                createdContact

        };

    }

    async getCompanies(): Promise<Company[]> {

        return companyService.getCompanies();

    }

    async getCompanyContacts(

        companyId: string

    ): Promise<Contact[]> {

        return contactService.getCompanyContacts(

            companyId

        );

    }

}

export const crmApplication =
    new CRMApplication();