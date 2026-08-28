import { prisma } from "../../shared/database/client";
import { Workflow } from "./workflow";
import { WorkflowStore } from "./workflow-store";
import { WorkflowStep } from "./workflow-step";
import { Prisma } from "@prisma/client";

export class PrismaWorkflowStore implements WorkflowStore {
    async create(workflow: Workflow): Promise<Workflow> {
        await prisma.workflow.create({
            data: {
                id: workflow.id,
                goal: workflow.goal,
                status: workflow.status,
                requiresFounderApproval: workflow.requiresFounderApproval,
                approvedAt: workflow.approvedAt,
                metadata: toJson(workflow.metadata),
                createdAt: workflow.createdAt,
                updatedAt: workflow.updatedAt,
                steps: {
                    create: workflow.steps.map((step) => toStepCreateData(step, workflow.id)),
                },
            },
        });

        return this.getOrThrow(workflow.id);
    }

    async get(id: string): Promise<Workflow | null> {
        const record = await prisma.workflow.findUnique({
            where: { id },
            include: { steps: true },
        });

        return record ? fromRecord(record) : null;
    }

    async save(workflow: Workflow): Promise<Workflow> {
        await prisma.$transaction(async (tx) => {
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
                where: {
                    workflowId: workflow.id,
                    id: { notIn: incomingIds },
                },
            });

            for (const step of workflow.steps) {
                const existing = await tx.workflowStep.findUnique({
                    where: { id: step.id },
                    select: { workflowId: true },
                });

                if (existing && existing.workflowId !== workflow.id) {
                    throw new Error(
                        `Workflow step ${step.id} belongs to workflow ${existing.workflowId}.`,
                    );
                }

                await tx.workflowStep.upsert({
                    where: { id: step.id },
                    create: toStepCreateData(step, workflow.id),
                    update: toStepUpdateData(step),
                });
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

function toStepCreateData(step: WorkflowStep, workflowId: string) {
    return {
        id: step.id,
        workflowId,
        title: step.title,
        description: step.description,
        agentId: step.agentId,
        capability: step.capability,
        dependsOn: toJson(step.dependsOn),
        priority: step.priority,
        requiresApproval: step.requiresApproval,
        status: step.status,
        input: step.input === undefined ? undefined : toJson(step.input),
        output: step.output === undefined ? undefined : toJson(step.output),
        error: step.error,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function toStepUpdateData(step: WorkflowStep) {
    return {
        title: step.title,
        description: step.description,
        agentId: step.agentId,
        capability: step.capability,
        dependsOn: toJson(step.dependsOn),
        priority: step.priority,
        requiresApproval: step.requiresApproval,
        status: step.status,
        input: step.input === undefined ? undefined : toJson(step.input),
        output: step.output === undefined ? undefined : toJson(step.output),
        error: step.error,
        updatedAt: new Date(),
    };
}

function toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
}

function fromRecord(record: any): Workflow {
    return {
        id: record.id,
        goal: record.goal,
        status: record.status,
        requiresFounderApproval: record.requiresFounderApproval,
        approvedAt: record.approvedAt ?? undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        metadata: record.metadata ?? {},
        steps: record.steps.map((step: any) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            agentId: step.agentId,
            capability: step.capability ?? undefined,
            dependsOn: Array.isArray(step.dependsOn) ? step.dependsOn : [],
            priority: step.priority,
            requiresApproval: step.requiresApproval,
            status: step.status,
            input: step.input ?? undefined,
            output: step.output ?? undefined,
            error: step.error ?? undefined,
        })),
    };
}
