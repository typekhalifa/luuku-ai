import crypto from "crypto";

import { companyService } from "../../shared/database/services/company.service";

import { contactService } from "../../shared/database/services/contact.service";

async function main() {

    const email =
        process.env.LUUKU_TEST_CONTACT_EMAIL?.trim().toLowerCase();

    const companyName =
        process.env.LUUKU_TEST_CONTACT_COMPANY?.trim();

    if (!email || !companyName) {
        throw new Error(
            "LUUKU_TEST_CONTACT_EMAIL and LUUKU_TEST_CONTACT_COMPANY are required."
        );
    }

    console.log("");
    console.log("========================================");
    console.log(" CONTROLLED TEST CONTACT PROVISIONING");
    console.log("========================================");
    console.log("");
    console.log(`Company : ${companyName}`);
    console.log(`Email   : ${email}`);
    console.log("");

    let company =
        await companyService.findCompany(companyName);

    if (!company) {
        company = await companyService.createCompany({
            id: crypto.randomUUID(),
            name: companyName,
            industry: "Artificial Intelligence",
            website: undefined,
            country: "Rwanda",
            city: "Kigali",
            size: "startup",
            status: "prospect",
            confidence: 100,
            verified: true,
            source: "Luuku AI Controlled Test Fixture",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        console.log("✓ Test company created");
    } else {
        console.log("✓ Test company already exists");
    }

    const contacts =
        await contactService.getCompanyContacts(company.id);

    const existing = contacts.find(
        contact =>
            contact.email?.trim().toLowerCase() === email
    );

    if (existing) {
        console.log("✓ Controlled test contact already exists");
        console.log(`Contact ID : ${existing.id}`);
        console.log(`Email      : ${existing.email}`);
        console.log("");
        return;
    }

    const contact =
        await contactService.createContact({
            id: crypto.randomUUID(),
            companyId: company.id,
            name: "Luuku AI Controlled Test Contact",
            email,
            phoneNumber: undefined,
            preferredLanguage: "English",
            department: "Testing",
            position: "Controlled Test Recipient",
            verified: true,
            confidence: 100,
            source: "Luuku AI Controlled Test Fixture",
            lastVerifiedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

    console.log("✓ Controlled test contact created");
    console.log(`Contact ID : ${contact.id}`);
    console.log(`Email      : ${contact.email}`);
    console.log("");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
