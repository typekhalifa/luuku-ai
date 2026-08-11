import crypto from "crypto";

import { SalesAgent } from "../business/sales/sales-agent";

import { AgentTask } from "../../shared/agents/interface";

import { companyService } from "../../shared/database/services/company.service";

import { contactService } from "../../shared/database/services/contact.service";

const TEST_COMPANY = "Luuku Email Test";
const TEST_RECIPIENT = process.env.EMAIL_TEST_RECIPIENT || "jeandh023@gmail.com";

async function ensureTestContact() {
    let company = await companyService.findCompany(TEST_COMPANY);

    if (!company) {
        company = await companyService.createCompany({
            id: crypto.randomUUID(),
            name: TEST_COMPANY,
            industry: "Artificial Intelligence",
            website: undefined,
            country: "Rwanda",
            city: "Kigali",
            size: "startup",
            status: "prospect",
            confidence: 100,
            verified: true,
            source: "Sales Email Smoke Test",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    const contacts = await contactService.getCompanyContacts(company.id);

    let contact = contacts.find(
        (candidate) => candidate.email === TEST_RECIPIENT
    );

    if (!contact) {
        contact = await contactService.createContact({
            id: crypto.randomUUID(),
            companyId: company.id,
            name: "Jean D'Amour",
            email: TEST_RECIPIENT,
            phoneNumber: "+250780000000",
            preferredLanguage: "English",
            department: "Executive",
            position: "Founder",
            verified: true,
            confidence: 100,
            source: "Sales Email Smoke Test",
            lastVerifiedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    return { company, contact };
}

async function main() {
    console.log("");
    console.log("========================================");
    console.log("   SALES AGENT REAL EMAIL SMOKE TEST");
    console.log("========================================");
    console.log("");
    console.log(`Test recipient: ${TEST_RECIPIENT}`);
    console.log(`Email mode    : ${process.env.EMAIL_MODE || "unset"}`);

    if (process.env.EMAIL_MODE !== "test") {
        throw new Error(
            "Safety stop: EMAIL_MODE must be 'test' for this smoke test."
        );
    }

    const { company, contact } = await ensureTestContact();

    console.log(`Company       : ${company.name}`);
    console.log(`Contact       : ${contact.email}`);
    console.log("");

    const task: AgentTask = {
        id: crypto.randomUUID(),
        title: `Follow up: ${company.name} by email`,
        description:
            "Send the controlled Luuku AI real communication layer test email through the Sales Agent. This is a development-only test to the configured test recipient.",
        priority: "high"
    };

    const agent = new SalesAgent();
    const result = await agent.execute(task);

    console.log("");
    console.log("========================================");
    console.log("         SALES TEST RESULT");
    console.log("========================================");
    console.log("");
    console.log(result);

    if (!result.success || !result.verified) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
