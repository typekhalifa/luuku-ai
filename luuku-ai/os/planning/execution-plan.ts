import { Plan } from "../../orchestration/planner/plan";

export interface ExecutionPlanStep {
    taskId: string;
    agentId: string;
    capability: string;
    dependsOn: string[];
    input: unknown;
}

export interface ExecutionPlan {
    id: string;
    goal: string;
    sourcePlanId: string;
    steps: ExecutionPlanStep[];
    requiresFounderApproval: boolean;
    createdAt: Date;
    metadata: Record<string, unknown>;
}

export function createExecutionPlan(plan: Plan): ExecutionPlan {
    const steps: ExecutionPlanStep[] = plan.tasks.map((task) => {
        const metadata = task.metadata as Record<string, unknown>;
        const agentId = metadata.agentId;
        const capability = metadata.capability;
        const dependsOn = metadata.dependsOn;

        if (typeof agentId !== "string" || agentId.trim() === "") {
            throw new Error(`Execution plan failed: task ${task.id} is missing metadata.agentId.`);
        }
        if (typeof capability !== "string" || capability.trim() === "") {
            throw new Error(`Execution plan failed: task ${task.id} is missing metadata.capability.`);
        }
        if (dependsOn !== undefined && (!Array.isArray(dependsOn) || dependsOn.some((id) => typeof id !== "string"))) {
            throw new Error(`Execution plan failed: task ${task.id} has invalid metadata.dependsOn.`);
        }

        return {
            taskId: task.id,
            agentId: agentId.trim(),
            capability: capability.trim(),
            dependsOn: (dependsOn as string[] | undefined)?.map((id) => id.trim()) ?? [],
            input: task.input,
        };
    });

    const taskIds = new Set(steps.map((step) => step.taskId));
    for (const step of steps) {
        for (const dependency of step.dependsOn) {
            if (!taskIds.has(dependency)) {
                throw new Error(`Execution plan failed: task ${step.taskId} depends on unknown task ${dependency}.`);
            }
            if (dependency === step.taskId) {
                throw new Error(`Execution plan failed: task ${step.taskId} cannot depend on itself.`);
            }
        }
    }

    return {
        id: `execution-${plan.id}`,
        goal: plan.goal,
        sourcePlanId: plan.id,
        steps,
        requiresFounderApproval: steps.some((step) => {
            const task = plan.tasks.find((candidate) => candidate.id === step.taskId);
            return task?.metadata.requiresApproval === true;
        }),
        createdAt: new Date(),
        metadata: { source: "planner", planMetadata: plan.metadata },
    };
}
