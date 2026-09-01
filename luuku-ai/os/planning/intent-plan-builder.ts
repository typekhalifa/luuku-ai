import { createExecutionPlan, type ExecutionPlan } from "./execution-plan.js";
import type { ExecutiveIntent } from "../executive/executive-intent.js";
import type { CapabilityResolver } from "./capability-resolver.js";
import { Priority } from "../../orchestration/task/priority.js";
import { TaskStatus } from "../../orchestration/task/task-status.js";
import { TaskType } from "../../orchestration/task/task-type.js";
import type { Task } from "../../orchestration/task/task.js";
import type { Plan } from "../../orchestration/planner/plan.js";

export interface IntentPlanCapabilityMap {
    readonly [intentType: string]: string;
}

export interface IntentPlanRequest {
    intent: ExecutiveIntent;
    capabilities: IntentPlanCapabilityMap;
}

/**
 * Converts executive intent into the existing planning/execution-plan contract.
 * Capability mappings are explicit inputs; this layer does not invent execution policy.
 */
export class ExecutiveIntentPlanBuilder {
    constructor(private readonly resolver: CapabilityResolver) {}

    build(request: IntentPlanRequest): ExecutionPlan {
        const capability = request.capabilities[request.intent.type];
        if (!capability || capability.trim() === "") {
            throw new Error(`Intent plan failed: no capability mapping for ${request.intent.type}.`);
        }

        const resolution = this.resolver.resolve({ capability: capability.trim() });
        if (!resolution) {
            throw new Error(`Intent plan failed: capability is unresolved: ${capability}.`);
        }

        const now = new Date();
        const task: Task = {
            id: `intent-task-${request.intent.id}`,
            title: request.intent.objective,
            description: request.intent.reason,
            type: TaskType.SUPPORT,
            priority: request.intent.type === "RECOVER_FAILED_WORK" ? Priority.HIGH : Priority.MEDIUM,
            status: TaskStatus.PENDING,
            input: { evidence: request.intent.evidence },
            metadata: {
                agentId: resolution.agentId,
                capability: resolution.capability,
                dependsOn: [],
                sourceIntentId: request.intent.id,
            },
            createdAt: now,
            updatedAt: now,
        };

        const plan: Plan = {
            id: `intent-plan-${request.intent.id}`,
            goal: request.intent.objective,
            tasks: [task],
            metadata: {
                source: "executive-intent",
                intentId: request.intent.id,
                intentType: request.intent.type,
            },
            createdAt: now,
        };

        return createExecutionPlan(plan);
    }
}
