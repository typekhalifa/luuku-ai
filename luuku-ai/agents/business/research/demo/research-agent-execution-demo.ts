import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { AgentTask } from "../../../../shared/agents/interface";
import type { ProspectResearchResult } from "../../../../shared/crm/web-research";
import type { ProspectValidation } from "../../../../shared/crm/prospect-validation";
import type { ProspectIntelligence } from "../../../../shared/crm/prospect-intelligence";
import {
    executeResearchTask,
    type ResearchAgentDependencies,
} from "../execute";

const researchFixture: ProspectResearchResult = {
    company: {
        name: "Example Rwanda Ltd",
        industry: "Business services",
        country: "Rwanda",
        confidence: 90,
        source: "https://example.com/about",
    },
    contact: {
        name: "Operations Department",
        preferredLanguage: "English",
        department: "Operations",
        confidence: 70,
        source: "https://example.com/contact",
    },
    sources: [
        { title: "About Example Rwanda", url: "https://example.com/about" },
        { title: "Contact Example Rwanda", url: "https://example.com/contact" },
    ],
    evidence: [
        {
            title: "About Example Rwanda",
            url: "https://example.com/about",
            content: "Public company profile excerpt used as research evidence.",
        },
        {
            title: "Contact Example Rwanda",
            url: "https://example.com/contact",
            content: "Public department contact excerpt used as research evidence.",
        },
    ],
    summary: "A controlled fixture for Research Agent execution testing.",
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
    why: "Controlled fixture only.",
    nextAction: "Validate a concrete workflow before outreach.",
    contactQuality: "UNVERIFIED",
};

async function main(): Promise<void> {
    const originalCwd = process.cwd();
    const temporaryCwd = fs.mkdtempSync(
        path.join(os.tmpdir(), "luuku-research-agent-demo-"),
    );

    try {
        process.chdir(temporaryCwd);

        let researchCalls = 0;
        const dependencies: ResearchAgentDependencies = {
            async researchProspect(company, reasons) {
                researchCalls += 1;
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
            id: "research-agent-controlled-demo",
            title: "Research a controlled prospect",
            description: "Test the Research Agent without live services or CRM writes.",
            priority: "medium",
            metadata: {
                company: "Example Rwanda Ltd",
                reasons: [
                    "Identify public company information.",
                    "Assess potential workflow automation fit.",
                ],
            },
        };

        const result = await executeResearchTask(task, dependencies);

        assert.equal(result.success, true);
        assert.equal(result.executionStatus, "completed");
        assert.equal(result.executed, true);
        assert.equal(result.verified, false);
        assert.equal(researchCalls, 1);
        assert.ok(result.evidence?.reference);

        const artifactPath = result.evidence?.reference;
        assert.ok(artifactPath);
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

        assert.equal(artifact.taskId, task.id);
        assert.equal(artifact.research.company.name, "Example Rwanda Ltd");
        assert.equal(artifact.research.evidence[0].content.includes("Public company profile excerpt"), true);
        assert.equal(artifact.opportunityValidation.opportunityConfidence, "LOW");
        assert.equal(artifact.prospectIntelligence.readiness, "VALIDATE");
        assert.equal(artifact.execution.verified, false);

        const invalidTask: AgentTask = {
            ...task,
            id: "research-agent-missing-input",
            metadata: {},
        };
        const blocked = await executeResearchTask(invalidTask, dependencies);

        assert.equal(blocked.success, false);
        assert.equal(blocked.executionStatus, "blocked");
        assert.equal(blocked.executed, false);
        assert.deepEqual(blocked.blockers, ["RESEARCH_COMPANY_REQUIRED"]);
        assert.equal(researchCalls, 1, "Invalid input must not call the research provider.");

        console.log("RESEARCH AGENT CONTROLLED EXECUTION DEMO");
        console.log("✓ Structured company and reasons are validated.");
        console.log("✓ Research, opportunity validation, and prospect assessment are composed.");
        console.log("✓ Source excerpts and source references are persisted in the artifact.");
        console.log("✓ Artifact is read back and structurally verified.");
        console.log("✓ Business outcome remains explicitly unverified.");
        console.log("✓ Missing input is blocked before any provider call.");
        console.log("✓ No database, CRM, or external communication was used.");
    } finally {
        process.chdir(originalCwd);
        fs.rmSync(temporaryCwd, { recursive: true, force: true });
    }
}

void main().catch((error: unknown) => {
    console.error("Research Agent controlled execution demo failed:", error);
    process.exitCode = 1;
});
