import { AgentResult } from "../../shared/agents/interface";
import { runAgent } from "../../shared/agents/runner";
import { Priority } from "../task/priority";
import { WorkflowStep } from "./workflow-step";
import { WorkflowStepExecutor } from "./workflow-orchestrator";

function toAgentPriority(priority: Priority): "low" | "medium" | "high" {
    switch (priority) {
        case Priority.LOW:
            return "low";
        case Priority.MEDIUM:
            return "medium";
        case Priority.HIGH:
        case Priority.CRITICAL:
            return "high";
    }
}

/**
 * Production boundary from a V6 workflow step into the existing shared
 * agent runner. The runner remains responsible for registry lookup and
 * duplicate-execution protection.
 */
export class SharedAgentWorkflowExecutor implements WorkflowStepExecutor {
    async execute(step: WorkflowStep): Promise<AgentResult> {
        return runAgent(step.agentId, {
            id: step.id,
            title: step.title,
            description: step.description,
            priority: toAgentPriority(step.priority),
            metadata: {
                workflowStepId: step.id,
                capability: step.capability,
                input: step.input,
            },
        });
    }
}
