import type { AgentResult, AgentTask } from "../../shared/agents/interface.js";
import { runAgent } from "../../shared/agents/runner.js";
import type { WorkflowStep } from "../workflow/workflow-step.js";
import {
    InMemoryProductionActuatorRegistry,
    ProductionActuatorComposition,
    type ProductionActuator,
} from "./production-actuator.js";

function taskFromWorkflowStep(step: WorkflowStep): AgentTask {
    return {
        id: step.id,
        title: step.title,
        description: step.description,
        priority: "medium",
        metadata: {
            ...(typeof step.input === "object" && step.input !== null
                ? step.input as Record<string, unknown>
                : {}),
            workflowId: step.workflowId,
            workflowStepId: step.id,
            ownershipScope: step.ownership?.scope,
            companyId: step.ownership?.scope === "COMPANY" ? step.ownership.companyId : undefined,
            capability: step.capability,
        },
    };
}

export function createAgentBackedProductionActuator(
    id: string,
    capability: string,
    expectedAgentId?: string,
): ProductionActuator {
    return {
        id,
        capabilities: [capability],
        async execute(step: WorkflowStep): Promise<AgentResult> {
            if (expectedAgentId && step.agentId !== expectedAgentId) {
                return {
                    success: false,
                    summary: `Production actuator ${id} requires agent ${expectedAgentId}; received ${step.agentId}.`,
                    completedAt: new Date().toISOString(),
                    executionStatus: "blocked",
                    executed: false,
                    verified: false,
                    blockers: ["AUTHORIZED_AGENT_MISMATCH"],
                };
            }

            return runAgent(step.agentId, taskFromWorkflowStep(step));
        },
    };
}

export function createDefaultProductionActuatorComposition(): ProductionActuatorComposition {
    const registry = new InMemoryProductionActuatorRegistry();

    // The actuator composes the existing Sales -> CRM -> Communication Router
    // -> provider -> evidence/reality path. It does not create a new execution system.
    registry.register(
        createAgentBackedProductionActuator(
            "sales-email",
            "email.send",
            "sales",
        ),
    );

    return new ProductionActuatorComposition(registry);
}
