import fs from "node:fs";
import path from "node:path";

import type { AgentTask, AgentResult } from "../../../shared/agents/interface";
import type { Prisma } from "@prisma/client";
import { researchedProspectService } from "../../../shared/database/services/researched-prospect.service";
import { crmApplication } from "../../../shared/application/crm.application";
import { salesApplication } from "../../../shared/application/sales.application";
import {
    researchProspect,
    type ProspectResearchResult,
} from "../../../shared/crm/web-research";
import {
    validateProspectOpportunity,
    type ProspectValidation,
} from "../../../shared/crm/prospect-validation";
import {
    assessProspect,
    type ProspectIntelligence,
} from "../../../shared/crm/prospect-intelligence";

interface ResearchInput {
    company: string;
    reasons: string[];
}

export interface ResearchAgentDependencies {
    researchProspect(
        company: string,
        reasons: string[],
    ): Promise<ProspectResearchResult>;
    validateProspectOpportunity(
        result: ProspectResearchResult,
    ): Promise<ProspectValidation>;
    assessProspect(result: ProspectResearchResult): ProspectIntelligence;
}

const defaultDependencies: ResearchAgentDependencies = {
    researchProspect,
    validateProspectOpportunity,
    assessProspect,
};

function readResearchInput(task: AgentTask): ResearchInput {
    const metadata = task.metadata ?? {};
    const company = metadata.company;
    const reasons = metadata.reasons;

    if (typeof company !== "string" || !company.trim()) {
        throw new Error("RESEARCH_COMPANY_REQUIRED");
    }

    if (
        !Array.isArray(reasons) ||
        reasons.length === 0 ||
        reasons.some((reason) => typeof reason !== "string" || !reason.trim())
    ) {
        throw new Error("RESEARCH_REASONS_REQUIRED");
    }

    return {
        company: company.trim(),
        reasons: reasons.map((reason: string) => reason.trim()),
    };
}

function safeTaskId(taskId: string): string {
    const safe = taskId.replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!safe) throw new Error("RESEARCH_TASK_ID_INVALID");
    return safe;
}

function persistResearchArtifact(
    task: AgentTask,
    input: ResearchInput,
    research: ProspectResearchResult,
    validation: ProspectValidation,
    intelligence: ProspectIntelligence,
    startedAt: string,
    completedAt: string,
): string {
    const directory = path.resolve(
        process.cwd(),
        "logs",
        "agent-executions",
        "research",
    );
    fs.mkdirSync(directory, { recursive: true });

    const filePath = path.join(
        directory,
        `research-${safeTaskId(task.id)}.json`,
    );
    const temporaryPath = `${filePath}.tmp`;

    const artifact = {
        schemaVersion: 1,
        agentId: "research",
        taskId: task.id,
        taskTitle: task.title,
        taskDescription: task.description,
        startedAt,
        completedAt,
        input,
        research,
        opportunityValidation: validation,
        prospectIntelligence: intelligence,
        execution: {
            status: "completed",
            executed: true,
            verified: false,
            verificationReason:
                "The research workflow and artifact were completed. Company/contact claims, contact-channel validity, and commercial opportunity have not been independently verified.",
        },
        interpretationNotes: [
            "Prospect intelligence scores are heuristic prioritization signals, not proof of buying intent.",
            "Contact quality is an assessment label and does not independently verify email or telephone deliverability.",
            "Opportunity validation is model-assisted analysis of the available research summary, not confirmation of an internal business problem.",
        ],
    };

    fs.writeFileSync(temporaryPath, JSON.stringify(artifact, null, 2), "utf8");
    fs.renameSync(temporaryPath, filePath);

    const persisted = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
        taskId?: string;
        research?: { sources?: unknown[] };
    };

    if (persisted.taskId !== task.id || !Array.isArray(persisted.research?.sources)) {
        throw new Error("RESEARCH_ARTIFACT_VERIFICATION_FAILED");
    }

    return filePath;
}

export async function executeResearchTask(
    task: AgentTask,
    dependencies: ResearchAgentDependencies = defaultDependencies,
): Promise<AgentResult> {
    const startedAt = new Date().toISOString();

    console.log("");
    console.log("========================================");
    console.log("        RESEARCH AGENT");
    console.log("========================================");

    let input: ResearchInput;
    try {
        input = readResearchInput(task);
        safeTaskId(task.id);
    } catch (error) {
        const blocker = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            summary: "Research task is missing valid structured input.",
            completedAt: new Date().toISOString(),
            executionStatus: "blocked",
            executed: false,
            verified: false,
            blockers: [blocker],
            verificationNotes: ["No research provider was called."],
        };
    }

    let researchCompleted = false;

    try {
        console.log(`Company: ${input.company}`);
        console.log("Gathering public research...");

        const research = await dependencies.researchProspect(
            input.company,
            input.reasons,
        );
        researchCompleted = true;

        if (!research.sources.length) {
            throw new Error("RESEARCH_RETURNED_NO_SOURCES");
        }

        console.log("Assessing opportunity evidence...");
        const validation = await dependencies.validateProspectOpportunity(research);

        console.log("Scoring Luuku AI prospect fit...");
        const intelligence = dependencies.assessProspect(research);

        const completedAt = new Date().toISOString();
        const artifactPath = persistResearchArtifact(
            task,
            input,
            research,
            validation,
            intelligence,
            startedAt,
            completedAt,
        );
        const artifactBytes = fs.statSync(artifactPath).size;
        const metadata = task.metadata ?? {};
        let durableProspectId: string | undefined;
        let crmWorkflowId: string | undefined;
        let crmContactId: string | undefined;
        let crmDealId: string | undefined;
        let crmActivityId: string | undefined;
        let salesHandoffPrepared = false;

        // Workflow executions carry tenant ownership from the existing V6
        // orchestrator. Standalone research demos remain artifact-only.
        if (typeof metadata.companyId === "string" && metadata.companyId.trim()) {
            if (metadata.ownershipScope !== "COMPANY") {
                throw new Error("RESEARCH_PROSPECT_TENANT_SCOPE_INVALID");
            }

            const persistedProspect = await researchedProspectService.persist({
                tenantCompanyId: metadata.companyId,
                researchTaskId: task.id,
                workflowId: typeof metadata.workflowId === "string" ? metadata.workflowId : undefined,
                business: research.company.name,
                industry: research.company.industry,
                website: research.company.website,
                country: research.company.country,
                city: research.company.city,
                size: research.company.size,
                fitScore: intelligence.score.overall,
                recommendedOffer: intelligence.recommendedOffer,
                owner: "research-agent",
                researchEvidence: JSON.parse(JSON.stringify({
                    sources: research.sources,
                    evidence: research.evidence,
                    summary: research.summary,
                    artifactPath,
                })) as Prisma.InputJsonValue,
                qualification: JSON.parse(JSON.stringify({
                    validation,
                    intelligence,
                })) as Prisma.InputJsonValue,
            });
            durableProspectId = persistedProspect.id;

            const crmResult = await crmApplication.registerProspect({
                prospectId: persistedProspect.id,
                company: {
                    name: research.company.name,
                    industry: research.company.industry,
                    website: research.company.website,
                    country: research.company.country,
                    city: research.company.city,
                    size: research.company.size,
                    status: "prospect",
                    confidence: research.company.confidence,
                    verified: false,
                    source: research.company.source,
                },
                contact: {
                    name: research.contact.name,
                    email: research.contact.email,
                    phoneNumber: research.contact.phoneNumber,
                    preferredLanguage: research.contact.preferredLanguage,
                    department: research.contact.department,
                    position: research.contact.position,
                    verified: false,
                    confidence: Math.round(research.contact.confidence),
                    source: research.contact.source,
                },
            }, {
                companyId: metadata.companyId,
                authMethod: "api-key",
                role: "SERVICE",
            });
            crmWorkflowId = crmResult.workflowId;
            crmContactId = crmResult.contact.id;
            crmDealId = crmResult.deal.id;
            crmActivityId = crmResult.activityId;

            // Reuse the existing Sales application to consume the durable
            // tenant prospect and prepare (but never dispatch) outreach.
            const preparedOutreach = await salesApplication.prepareTenantOutreachById(
                persistedProspect.id,
                metadata.companyId,
            );
            if (preparedOutreach.prospectId !== persistedProspect.id) {
                throw new Error("RESEARCH_SALES_PROSPECT_HANDOFF_MISMATCH");
            }
            salesHandoffPrepared = true;
        }

        return {
            success: true,
            summary:
                `Research completed for ${research.company.name}. ` +
                `Luuku fit: ${intelligence.score.overall}/10; ` +
                `readiness: ${intelligence.readiness}; ` +
                `opportunity confidence: ${validation.opportunityConfidence}. ` +
                (durableProspectId
                    ? "Research, tenant CRM registration, and Sales preparation completed; business claims remain unverified."
                    : "The local research artifact was persisted; no tenant CRM handoff was requested, and business claims remain unverified."),
            completedAt,
            executionStatus: "completed",
            executed: true,
            verified: false,
            evidence: {
                provider: "tavily-openai-luuku-research",
                externalId: task.id,
                reference: artifactPath,
                details: {
                    agentId: "research",
                    company: research.company.name,
                    sourceCount: research.sources.length,
                    artifactPersisted: true,
                    artifactBytes,
                    durableProspectPersisted: !!durableProspectId,
                    durableProspectId,
                    crmRegistered: !!durableProspectId,
                    crmWorkflowId,
                    crmContactId,
                    crmDealId,
                    crmActivityId,
                    salesHandoffPrepared,
                    salesHandoffProspectId: salesHandoffPrepared ? durableProspectId : undefined,
                    externalOutreachDispatched: false,
                    opportunityConfidence: validation.opportunityConfidence,
                    prospectScore: intelligence.score.overall,
                    prospectReadiness: intelligence.readiness,
                    contactQualityAssessment: intelligence.contactQuality,
                    startedAt,
                },
            },
            verificationNotes: [
                "Public-source research completed through the configured research provider.",
                "Opportunity validation and prospect-fit assessment completed.",
                "The local research artifact was written and read back for structural verification.",
                "The prospect-fit and contact-quality labels are heuristic assessments, not independent verification.",
                ...(durableProspectId
                    ? [
                        "The tenant-owned prospect, source-backed qualification, primary CRM contact, opportunity, and activity were persisted and linked.",
                        "The existing Sales application successfully prepared outreach; no message was dispatched.",
                    ]
                    : [
                        "No tenant-scoped database prospect or CRM records were created because this task had no company ownership context.",
                    ]),
            ],
        };
    } catch (error) {
        const completedAt = new Date().toISOString();
        const message = error instanceof Error ? error.message : String(error);

        return {
            success: false,
            summary: `Research execution failed for "${task.title}": ${message}`,
            completedAt,
            executionStatus: "failed",
            executed: researchCompleted,
            verified: false,
            blockers: [message],
            verificationNotes: [
                researchCompleted
                    ? "Public research completed, but a later assessment or artifact-persistence step failed."
                    : "Research did not complete successfully.",
                "The workflow failed after research; tenant Prospect or CRM writes may have partially completed and must be reconciled using the tenant and research-task identity.",
                "This execution path does not dispatch external outreach.",
            ],
        };
    }
}
