import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { AgentTask } from "../../../../shared/agents/interface";
import type { ProspectResearchResult } from "../../../../shared/crm/web-research";
import type { ProspectValidation } from "../../../../shared/crm/prospect-validation";
import type { ProspectIntelligence } from "../../../../shared/crm/prospect-intelligence";
import { prisma } from "../../../../shared/database/client";
import { researchedProspectService } from "../../../../shared/database/services/researched-prospect.service";
import { salesApplication } from "../../../../shared/application/sales.application";
import {
    executeResearchTask,
    type ResearchAgentDependencies,
} from "../execute";

const researchFixture: ProspectResearchResult = {
    company: {
        name: "Example Rwanda Ltd",
        industry: "Business services",
        website: "https://example.test",
        country: "Rwanda",
        city: "Kigali",
        size: "small",
        confidence: 90,
        source: "https://example.test/about",
    },
    contact: {
        name: "Operations Department",
        email: "operations@example.test",
        preferredLanguage: "English",
        department: "Operations",
        position: "Department",
        confidence: 70,
        source: "https://example.test/contact",
    },
    sources: [
        { title: "About Example Rwanda", url: "https://example.test/about" },
        { title: "Contact Example Rwanda", url: "https://example.test/contact" },
    ],
    evidence: [
        {
            title: "About Example Rwanda",
            url: "https://example.test/about",
            content: "Controlled public company profile excerpt for integration testing.",
        },
        {
            title: "Contact Example Rwanda",
            url: "https://example.test/contact",
            content: "Controlled public department contact excerpt for integration testing.",
        },
    ],
    summary: "Controlled fixture; no live research provider is used.",
};

const validationFixture: ProspectValidation = {
    opportunityConfidence: "LOW",
    concreteSignals: [],
    unknowns: ["No confirmed workflow bottleneck in this controlled fixture."],
    validationQueries: ["Example Rwanda workflow automation"],
    recommendedValidation: "Interview an authorized business representative.",
};

const intelligenceFixture: ProspectIntelligence = {
    score: {
        aiNeed: 6,
        workflowPotential: 6,
        knowledgeFit: 6,
        outreachAttractiveness: 5,
        overall: 5.8,
    },
    confidence: "LOW",
    readiness: "VALIDATE",
    tags: [],
    opportunity: "Workflow and knowledge automation",
    recommendedOffer: "AI Workflow & Knowledge Audit",
    why: "Controlled integration fixture only.",
    nextAction: "Validate a concrete workflow before outreach.",
    contactQuality: "PARTIAL",
};

async function main(): Promise<void> {
    const originalCwd = process.cwd();
    const temporaryCwd = fs.mkdtempSync(
        path.join(os.tmpdir(), "luuku-research-crm-integration-"),
    );
    const tenantCompanyId = "phase4-test-tenant-" + randomUUID();
    const researchTaskId = "phase4-research-task-" + randomUUID();
    const workflowId = "phase4-workflow-" + randomUUID();
    const tenantName = "Phase 4 Integration Tenant " + randomUUID();
    let tenantCreated = false;

    try {
        process.chdir(temporaryCwd);

        await prisma.company.create({
            data: {
                id: tenantCompanyId,
                name: tenantName,
                industry: "Software",
                country: "Rwanda",
                status: "prospect",
                confidence: 100,
                verified: false,
                source: "phase4-controlled-integration-test",
            },
        });
        tenantCreated = true;

        let providerCalls = 0;
        const dependencies: ResearchAgentDependencies = {
            async researchProspect(company, reasons) {
                providerCalls += 1;
                assert.equal(company, "Example Rwanda Ltd");
                assert.equal(reasons.length, 2);
                return researchFixture;
            },
            async validateProspectOpportunity(result) {
                assert.equal(result.company.name, researchFixture.company.name);
                return validationFixture;
            },
            assessProspect(result) {
                assert.equal(result.sources.length, 2);
                return intelligenceFixture;
            },
        };

        const task: AgentTask = {
            id: researchTaskId,
            title: "Controlled Research to CRM to Sales integration",
            description: "Persist a fixture prospect, link CRM records, and prepare outreach without dispatch.",
            priority: "medium",
            metadata: {
                company: "Example Rwanda Ltd",
                reasons: [
                    "Identify public company information.",
                    "Assess potential workflow automation fit.",
                ],
                companyId: tenantCompanyId,
                ownershipScope: "COMPANY",
                workflowId,
            },
        };

        const first = await executeResearchTask(task, dependencies);
        assert.equal(first.success, true, first.summary);
        assert.equal(first.executionStatus, "completed");
        assert.equal(first.verified, false);

        const firstDetails = first.evidence?.details as Record<string, unknown>;
        assert.equal(firstDetails.durableProspectPersisted, true);
        assert.equal(firstDetails.crmRegistered, true);
        assert.equal(firstDetails.salesHandoffPrepared, true);
        assert.equal(firstDetails.externalOutreachDispatched, false);

        const prospectId = String(firstDetails.durableProspectId);
        assert.ok(prospectId);
        assert.equal(firstDetails.salesHandoffProspectId, prospectId);

        const storedProspect = await researchedProspectService.getById(
            prospectId,
            tenantCompanyId,
        );
        assert.ok(storedProspect);
        assert.equal(storedProspect.business, "Example Rwanda Ltd");
        assert.equal(storedProspect.researchTaskId, researchTaskId);
        assert.ok(storedProspect.researchEvidence);

        const prepared = await salesApplication.prepareTenantOutreachById(
            prospectId,
            tenantCompanyId,
        );
        assert.equal(prepared.prospectId, prospectId);
        assert.equal(prepared.dispatch.executed, false);
        assert.ok(prepared.messages.email.length > 0);

        await assert.rejects(
            salesApplication.getTenantProspectById(prospectId, "foreign-" + tenantCompanyId),
            /PROSPECT_NOT_FOUND_OR_UNAUTHORIZED/,
            "A different tenant must not resolve this prospect by ID.",
        );

        const second = await executeResearchTask(task, dependencies);
        assert.equal(second.success, true, second.summary);
        assert.equal(second.executionStatus, "completed");

        const secondDetails = second.evidence?.details as Record<string, unknown>;
        assert.equal(secondDetails.durableProspectId, prospectId);
        assert.equal(secondDetails.crmContactId, firstDetails.crmContactId);
        assert.equal(secondDetails.crmDealId, firstDetails.crmDealId);
        assert.equal(secondDetails.crmActivityId, firstDetails.crmActivityId);
        assert.equal(secondDetails.salesHandoffProspectId, prospectId);
        assert.equal(secondDetails.externalOutreachDispatched, false);

        const [prospectCount, contacts, deals, activities, communicationExecutions] =
            await Promise.all([
                prisma.prospect.count({
                    where: { tenantCompanyId, researchTaskId },
                }),
                prisma.contact.findMany({
                    where: { companyId: tenantCompanyId, prospectId },
                }),
                prisma.deal.findMany({
                    where: { companyId: tenantCompanyId, prospectId },
                }),
                prisma.activity.findMany({
                    where: {
                        companyId: tenantCompanyId,
                        title: "Prospect Registered",
                        dealId: String(firstDetails.crmDealId),
                    },
                }),
                prisma.communicationExecution.count({
                    where: { companyId: tenantCompanyId },
                }),
            ]);

        assert.equal(prospectCount, 1, "Retry must not duplicate the durable prospect.");
        assert.equal(contacts.length, 1, "Retry must not duplicate the CRM contact.");
        assert.equal(deals.length, 1, "Retry must not duplicate the CRM deal.");
        assert.equal(activities.length, 1, "Retry must not duplicate the CRM activity.");
        assert.equal(contacts[0]?.prospectId, prospectId);
        assert.equal(deals[0]?.prospectId, prospectId);
        assert.equal(communicationExecutions, 0, "No outbound communication execution may be created.");
        assert.equal(providerCalls, 2, "Fixture research runs once per task attempt.");

        console.log("PHASE 4 RESEARCH -> CRM -> SALES POSTGRES INTEGRATION");
        console.log("✓ Tenant-owned Prospect persisted with source evidence.");
        console.log("✓ CRM Contact and Deal linked to the exact Prospect ID.");
        console.log("✓ Existing CRM Activity registration persisted.");
        console.log("✓ Sales prepared outreach using the exact Prospect ID.");
        console.log("✓ Cross-tenant Prospect lookup was rejected.");
        console.log("✓ Retrying the same task reused the Prospect, Contact, Deal, and Activity.");
        console.log("✓ No CommunicationExecution records or external messages were created.");
    } finally {
        if (tenantCreated) {
            await prisma.company.delete({ where: { id: tenantCompanyId } });
        }
        await prisma.$disconnect();
        process.chdir(originalCwd);
        fs.rmSync(temporaryCwd, { recursive: true, force: true });
    }
}

void main().catch((error: unknown) => {
    console.error("Phase 4 Research to CRM to Sales integration failed:", error);
    process.exitCode = 1;
});
