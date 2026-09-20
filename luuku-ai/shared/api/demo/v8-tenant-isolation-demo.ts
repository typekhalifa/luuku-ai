import crypto from "node:crypto";

import { prisma } from "../../shared/database/client";
import { companyService } from "../../shared/database/services/company.service";
import { contactService } from "../../shared/database/services/contact.service";
import { dealService } from "../../shared/database/services/deal.service";
import { activityService } from "../../shared/database/services/activity.service";
import type { Company } from "../../shared/domain/company";
import type { Contact } from "../../shared/domain/contact";
import type { Deal } from "../../shared/domain/deal";
import type { Activity } from "../../shared/domain/activity";

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`TENANT ISOLATION ASSERTION FAILED: ${message}`);
}

function makeCompany(id: string, name: string): Company {
    const now = new Date().toISOString();

    return {
        id,
        name,
        industry: "Testing",
        website: undefined,
        country: "Rwanda",
        city: "Kigali",
        size: "small",
        status: "prospect",
        confidence: 100,
        verified: true,
        source: "V8 Tenant Isolation Test",
        createdAt: now,
        updatedAt: now
    };
}

function makeContact(id: string, companyId: string): Contact {
    const now = new Date().toISOString();

    return {
        id,
        companyId,
        name: `Tenant Contact ${companyId.slice(0, 8)}`,
        email: `${id}@tenant-isolation.test`,
        phoneNumber: "+250780000000",
        preferredLanguage: "English",
        department: "Testing",
        position: "Test Contact",
        verified: true,
        confidence: 100,
        source: "V8 Tenant Isolation Test",
        lastVerifiedAt: now,
        createdAt: now,
        updatedAt: now
    };
}

function makeDeal(id: string, companyId: string): Deal {
    const now = new Date().toISOString();

    return {
        id,
        companyId,
        title: "Tenant Isolation Deal",
        value: 100,
        currency: "USD",
        stage: "lead",
        probability: 10,
        ownerAgentId: "tenant-isolation-test",
        nextAction: "Verify isolation",
        createdAt: now,
        updatedAt: now
    };
}

function makeActivity(id: string, companyId: string, contactId: string, dealId: string): Activity {
    return {
        id,
        companyId,
        contactId,
        dealId,
        type: "note",
        title: "Tenant Isolation Activity",
        description: "Tenant isolation regression test",
        outcome: undefined,
        createdBy: "tenant-isolation-test",
        completed: true,
        createdAt: new Date().toISOString()
    };
}

async function main(): Promise<void> {
    const companyAId = crypto.randomUUID();
    const companyBId = crypto.randomUUID();
    const contactAId = crypto.randomUUID();
    const contactBId = crypto.randomUUID();
    const dealAId = crypto.randomUUID();
    const dealBId = crypto.randomUUID();
    const activityAId = crypto.randomUUID();
    const activityBId = crypto.randomUUID();

    console.log("");
    console.log("======================================");
    console.log(" V8 TENANT ISOLATION REGRESSION TEST");
    console.log("======================================");
    console.log("");

    try {
        await companyService.createCompany(makeCompany(companyAId, "Tenant A Isolation Test"));
        await companyService.createCompany(makeCompany(companyBId, "Tenant B Isolation Test"));

        await contactService.createContact(makeContact(contactAId, companyAId), companyAId);
        await contactService.createContact(makeContact(contactBId, companyBId), companyBId);

        await dealService.createDeal(makeDeal(dealAId, companyAId), companyAId);
        await dealService.createDeal(makeDeal(dealBId, companyBId), companyBId);

        await activityService.createActivity(
            makeActivity(activityAId, companyAId, contactAId, dealAId),
            companyAId
        );
        await activityService.createActivity(
            makeActivity(activityBId, companyBId, contactBId, dealBId),
            companyBId
        );

        const companiesA = await companyService.getCompanies(companyAId);
        const contactsA = await contactService.getContacts(companyAId);
        const dealsA = await dealService.getDeals(companyAId);
        const activitiesA = await activityService.getActivities(companyAId);

        assert(companiesA.length === 1 && companiesA[0].id === companyAId, "tenant A sees only its company");
        assert(contactsA.length === 1 && contactsA[0].id === contactAId, "tenant A sees only its contacts");
        assert(dealsA.length === 1 && dealsA[0].id === dealAId, "tenant A sees only its deals");
        assert(activitiesA.length === 1 && activitiesA[0].id === activityAId, "tenant A sees only its activities");

        assert(await contactService.getContact(contactBId, companyAId) === null, "tenant A cannot read tenant B contact");
        assert(await dealService.getDeal(dealBId, companyAId) === null, "tenant A cannot read tenant B deal");
        assert(await companyService.getCompany(companyBId, companyAId) === null, "tenant A cannot read tenant B company");

        let blocked = false;
        try {
            await contactService.deleteContact(contactBId, companyAId);
        } catch {
            blocked = true;
        }
        assert(blocked, "tenant A cannot delete tenant B contact");

        blocked = false;
        try {
            await dealService.deleteDeal(dealBId, companyAId);
        } catch {
            blocked = true;
        }
        assert(blocked, "tenant A cannot delete tenant B deal");

        blocked = false;
        try {
            await activityService.createActivity(makeActivity(
                crypto.randomUUID(),
                companyBId,
                contactBId,
                dealBId
            ), companyAId);
        } catch {
            blocked = true;
        }
        assert(blocked, "tenant A cannot create an activity for tenant B");

        blocked = false;
        try {
            await contactService.createContact(makeContact(crypto.randomUUID(), companyBId), companyAId);
        } catch {
            blocked = true;
        }
        assert(blocked, "tenant A cannot create a contact for tenant B");

        blocked = false;
        try {
            await dealService.createDeal(makeDeal(crypto.randomUUID(), companyBId), companyAId);
        } catch {
            blocked = true;
        }
        assert(blocked, "tenant A cannot create a deal for tenant B");

        console.log("✓ Tenant A list reads are isolated");
        console.log("✓ Tenant A cannot read tenant B resources by ID");
        console.log("✓ Tenant A cannot delete tenant B contacts");
        console.log("✓ Tenant A cannot delete tenant B deals");
        console.log("✓ Tenant A cannot create tenant B activities");
        console.log("✓ Tenant A cannot create tenant B contacts");
        console.log("✓ Tenant A cannot create tenant B deals");
        console.log("");
        console.log("V8 TENANT ISOLATION: PASS");
    } finally {
        await prisma.activity.deleteMany({
            where: { id: { in: [activityAId, activityBId] } }
        });
        await prisma.deal.deleteMany({
            where: { id: { in: [dealAId, dealBId] } }
        });
        await prisma.contact.deleteMany({
            where: { id: { in: [contactAId, contactBId] } }
        });
        await prisma.company.deleteMany({
            where: { id: { in: [companyAId, companyBId] } }
        });
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
