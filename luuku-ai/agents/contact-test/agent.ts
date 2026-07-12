import crypto from "crypto";

import { companyService } from "../../shared/database/services/company.service";

import { contactService } from "../../shared/database/services/contact.service";

async function main() {

    console.log("");

    console.log("========================================");

    console.log("      CONTACT SMOKE TEST");

    console.log("========================================");

    console.log("");

    const company =

        await companyService.createCompany({

            id: crypto.randomUUID(),

            name:

                "Luuku Contact Test",

            industry:

                "Artificial Intelligence",

            website:

                undefined,

            country:

                "Rwanda",

            city:

                "Kigali",

            size:

                "startup",

            status:

                "prospect",

            confidence:

                100,

            verified:

                true,

            source:

                "Contact Smoke Test",

            createdAt:

                new Date().toISOString(),

            updatedAt:

                new Date().toISOString()

        });

    console.log("✓ Company Created");

    console.log(company);

    console.log("");

    const contact =

        await contactService.createContact({

            id:

                crypto.randomUUID(),

            companyId:

                company.id,

            name:

                "Jean D'Amour",

            email:

                "captain@luuku.ai",

            phoneNumber:

                "+250780000000",

            preferredLanguage:

                "English",

            department:

                "Executive",

            position:

                "Founder",

            verified:

                true,

            confidence:

                100,

            source:

                "Contact Smoke Test",

            lastVerifiedAt:

                new Date().toISOString(),

            createdAt:

                new Date().toISOString(),

            updatedAt:

                new Date().toISOString()

        });

    console.log("");

    console.log("✓ Contact Created");

    console.log(contact);

    console.log("");

    const contacts =

        await contactService.getCompanyContacts(

            company.id

        );

    console.log("");

    console.log("========================================");

    console.log("      COMPANY CONTACTS");

    console.log("========================================");

    console.log("");

    console.log(contacts);

}

main().catch(console.error);