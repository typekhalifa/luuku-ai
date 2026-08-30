import { Plan } from "../planner/plan";
import { Task } from "../task/task";
import { WorkflowStatus } from "./workflow-status";
import { Workflow } from "./workflow";
import { WorkflowStep } from "./workflow-step";

interface TaskWorkflowMetadata {
    agentId?: unknown;
    capability?: unknown;
    dependsOn?: unknown;
    requiresApproval?: unknown;
}

function readMetadata(task: Task): TaskWorkflowMetadata {
    return task.metadata as TaskWorkflowMetadata;
}

function readString(value: unknown, field: string, taskId: string): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Workflow compilation failed: ${field} for task ${taskId} must be a non-empty string.`);
    }
    return value.trim();
}

function readDependencies(value: unknown, taskId: string): string[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
        throw new Error(`Workflow compilation failed: dependsOn for task ${taskId} must be an array of non-empty strings.`);
    }
    return value.map((item) => item.trim());
}

function readApproval(value: unknown, taskId: string): boolean {
    if (value === undefined) return false;
    if (typeof value !== "boolean") {
        throw new Error(`Workflow compilation failed: requiresApproval for task ${taskId} must be boolean.`);
    }
    return value;
}

export class WorkflowCompiler {
    compile(plan: Plan): Workflow {
        const taskIds = new Set(plan.tasks.map((task) => task.id));

        const steps: WorkflowStep[] = plan.tasks.map((task) => {
            const metadata = readMetadata(task);
            const agentId = readString(metadata.agentId, "agentId", task.id);
            if (!agentId) {
                throw new Error(`Workflow compilation failed: task ${task.id} is missing metadata.agentId.`);
            }

            const capability = readString(metadata.capability, "capability", task.id);
            const dependsOn = readDependencies(metadata.dependsOn, task.id);
            const requiresApproval = readApproval(metadata.requiresApproval, task.id);

            for (const dependencyId of dependsOn) {
                if (!taskIds.has(dependencyId)) {
                    throw new Error(`Workflow compilation failed: task ${task.id} depends on unknown task ${dependencyId}.`);
                }
                if (dependencyId === task.id) {
                    throw new Error(`Workflow compilation failed: task ${task.id} cannot depend on itself.`);
                }
            }

            return {
                id: task.id,
                title: task.title,
                description: task.description,
                agentId,
                capability,
                dependsOn,
                priority: task.priority,
                requiresApproval,
                status: "PENDING",
                input: task.input,
            };
        });

        const requiresFounderApproval = steps.some((step) => step.requiresApproval);

        return {
            id: `workflow-${plan.id}`,
            goal: plan.goal,
            status: WorkflowStatus.READY,
            steps,
            requiresFounderApproval,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
                source: "plan",
                planId: plan.id,
                planMetadata: plan.metadata,
            },
        };
    }
}
