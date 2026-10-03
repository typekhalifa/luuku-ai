import { prisma } from "../database/client";

export interface RuntimeStatus {
    activeAgent: string | null;
    currentTask: string | null;
    status: "idle" | "running";
}

export class RuntimeApplication {

    async getStatus(companyId: string): Promise<RuntimeStatus> {
        const execution = await prisma.communicationExecution.findFirst({
            where: {
                companyId,
                status: "executing",
            },
            orderBy: { updatedAt: "desc" },
            select: {
                taskId: true,
                recipient: true,
            },
        });

        if (!execution) {
            return {
                activeAgent: null,
                currentTask: null,
                status: "idle",
            };
        }

        const workflowId =
            typeof execution.recipient === "object" &&
            execution.recipient !== null &&
            "workflowId" in execution.recipient
                ? String((execution.recipient as { workflowId?: unknown }).workflowId ?? "")
                : "";

        const step = workflowId
            ? await prisma.workflowStep.findUnique({
                where: { id: execution.taskId ?? "" },
                select: { title: true, agentId: true, workflowId: true },
            })
            : null;

        if (!step || step.workflowId !== workflowId) {
            return {
                activeAgent: null,
                currentTask: null,
                status: "running",
            };
        }

        return {
            activeAgent: step.agentId,
            currentTask: step.title,
            status: "running",
        };
    }

}

export const runtimeApplication =
    new RuntimeApplication();
