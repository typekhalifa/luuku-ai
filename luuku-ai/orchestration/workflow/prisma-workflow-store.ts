import { prisma } from "../../shared/database/client";
import { Workflow } from "./workflow";
import { WorkflowStore } from "./workflow-store";
import { WorkflowStep } from "./workflow-step";
import { Prisma } from "@prisma/client";
import type { ExecutionOwnership } from "../ownership";
import { assertValidExecutionOwnership, ownershipMatches } from "../ownership";

export class PrismaWorkflowStore implements WorkflowStore {
    constructor(private readonly ownership: ExecutionOwnership) {
        assertValidExecutionOwnership(ownership);
    }

    private ownershipWhere() {
        return this.ownership.scope === "COMPANY"
            ? { ownershipScope: "COMPANY", companyId: this.ownership.companyId }
            : { ownershipScope: "SYSTEM", companyId: null };
    }

    private assertOwnership(workflow: Workflow): void {
        if (!ownershipMatches(this.ownership, workflow.ownership)) {
            throw new Error("WORKFLOW_OWNERSHIP_MISMATCH");
        }
    }

    async create(workflow: Workflow): Promise<Workflow> {
        this.assertOwnership(workflow);
        await prisma.workflow.create({
            data: {
                id: workflow.id,
                ownershipScope: workflow.ownership.scope,
                companyId: workflow.ownership.scope === "COMPANY" ? workflow.ownership.companyId : null,
                goal: workflow.goal,
                status: workflow.status,
                requiresFounderApproval: workflow.requiresFounderApproval,
                approvedAt: workflow.approvedAt,
                metadata: toJson(workflow.metadata),
                createdAt: workflow.createdAt,
                updatedAt: workflow.updatedAt,
                steps: { create: workflow.steps.map((step) => toNestedStepCreateData(step)) },
            },
        });
        return this.getOrThrow(workflow.id);
    }

    async get(id: string): Promise<Workflow | null> {
        const record = await prisma.workflow.findFirst({
            where: { id, ...this.ownershipWhere() },
            include: { steps: true },
        });
        return record ? fromRecord(record) : null;
    }

    async list(): Promise<Workflow[]> {
        const records = await prisma.workflow.findMany({
            where: this.ownershipWhere(),
            include: { steps: true },
            orderBy: { createdAt: "asc" },
        });
        return records.map(fromRecord);
    }

    async save(workflow: Workflow): Promise<Workflow> {
        this.assertOwnership(workflow);
        await prisma.$transaction(async (tx) => {
            const existing = await tx.workflow.findFirst({
                where: { id: workflow.id, ...this.ownershipWhere() },
                select: { id: true, ownershipScope: true, companyId: true },
            });
            if (!existing) throw new Error(`Workflow ${workflow.id} was not found in the requested ownership scope.`);

            await tx.workflow.update({
                where: { id: workflow.id },
                data: {
                    goal: workflow.goal,
                    status: workflow.status,
                    requiresFounderApproval: workflow.requiresFounderApproval,
                    approvedAt: workflow.approvedAt,
                    metadata: toJson(workflow.metadata),
                    updatedAt: workflow.updatedAt,
                },
            });

            const incomingIds = workflow.steps.map((step) => step.id);
            await tx.workflowStep.deleteMany({
                where: { workflowId: workflow.id, id: { notIn: incomingIds } },
            });

            for (const step of workflow.steps) {
                const existingStep = await tx.workflowStep.findUnique({
                    where: { id: step.id },
                    select: { workflowId: true },
                });
                if (existingStep && existingStep.workflowId !== workflow.id) {
                    throw new Error(`Workflow step ${step.id} belongs to workflow ${existingStep.workflowId}.`);
                }
                if (existingStep) {
                    await tx.workflowStep.update({
                        where: { id: step.id },
                        data: toStepUpdateData(step),
                    });
                } else {
                    await tx.workflowStep.create({
                        data: toStepCreateData(step, workflow.id),
                    });
                }
            }
        });
        return this.getOrThrow(workflow.id);
    }

    private async getOrThrow(id: string): Promise<Workflow> {
        const workflow = await this.get(id);
        if (!workflow) throw new Error(`Workflow ${id} was not found after persistence.`);
        return workflow;
    }
}

function toNestedStepCreateData(step: WorkflowStep) {
    return {
        id: step.id, title: step.title, description: step.description, agentId: step.agentId,
        capability: step.capability, dependsOn: toJson(step.dependsOn), priority: step.priority,
        requiresApproval: step.requiresApproval, status: step.status,
        input: step.input === undefined ? undefined : toJson(step.input),
        output: step.output === undefined ? undefined : toJson(step.output),
        error: step.error, createdAt: new Date(), updatedAt: new Date(),
    };
}

function toStepCreateData(step: WorkflowStep, workflowId: string) {
    return { ...toNestedStepCreateData(step), workflowId };
}

function toStepUpdateData(step: WorkflowStep) {
    return {
        title: step.title, description: step.description, agentId: step.agentId, capability: step.capability,
        dependsOn: toJson(step.dependsOn), priority: step.priority, requiresApproval: step.requiresApproval,
        status: step.status, input: step.input === undefined ? undefined : toJson(step.input),
        output: step.output === undefined ? undefined : toJson(step.output), error: step.error, updatedAt: new Date(),
    };
}

function toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
}

function fromRecord(record: any): Workflow {
    if (record.ownershipScope !== "COMPANY" && record.ownershipScope !== "SYSTEM") {
        throw new Error("WORKFLOW_OWNERSHIP_UNRESOLVED");
    }
    if (record.ownershipScope === "COMPANY" && typeof record.companyId !== "string") {
        throw new Error("WORKFLOW_OWNERSHIP_UNRESOLVED");
    }

    const ownership: ExecutionOwnership = record.ownershipScope === "COMPANY"
        ? { scope: "COMPANY", companyId: record.companyId }
        : { scope: "SYSTEM" };

    return {
        id: record.id,
        ownership,
        goal: record.goal,
        status: record.status,
        requiresFounderApproval: record.requiresFounderApproval,
        approvedAt: record.approvedAt ?? undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        metadata: record.metadata ?? {},
        steps: record.steps.map((step: any) => ({
            id: step.id, workflowId: step.workflowId, ownership: ownership, title: step.title, description: step.description,
            agentId: step.agentId, capability: step.capability,
            dependsOn: Array.isArray(step.dependsOn) ? step.dependsOn : [],
            priority: step.priority, requiresApproval: step.requiresApproval, status: step.status,
            input: step.input ?? undefined, output: step.output ?? undefined, error: step.error ?? undefined,
        })),
    };
}
