import type {
    ExecutionPlan,
} from "@/features/core/planner/types/plan";

import type {
    ExecutionResult,
} from "../types/execution";

import {
    addLog,
} from "@/features/core/logs/services/log.service";

export async function executePlan(
    plan: ExecutionPlan
): Promise<ExecutionResult> {

    for (const step of plan.steps) {

        addLog({

            id: crypto.randomUUID(),

            task: step.title,

            agent: step.assignedTo,

            status: "started",

            timestamp: new Date().toLocaleTimeString(),

        });

        await new Promise(

            (resolve) =>

                setTimeout(resolve, 500)

        );

        addLog({

            id: crypto.randomUUID(),

            task: step.title,

            agent: step.assignedTo,

            status: "completed",

            timestamp: new Date().toLocaleTimeString(),

        });

    }

    return {

        success: true,

        completedTasks: plan.steps.length,

        failedTasks: 0,

    };

}