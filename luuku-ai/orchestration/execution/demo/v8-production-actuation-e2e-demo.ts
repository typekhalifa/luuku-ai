import type { AgentResult } from "../../../shared/agents/interface.js";
import { Priority } from "../../task/priority.js";
import {
    InMemoryProductionActuatorRegistry,
    ProductionActuatorComposition,
} from "../production-actuator.js";
import { WorkflowOrchestrator } from "../../workflow/workflow-orchestrator.js";
import type { Workflow } from "../../workflow/workflow.js";
import type { WorkflowStep } from "../../workflow/workflow-step.js";
import type { WorkflowStepExecutor } from "../../workflow/workflow-orchestrator.js";

class InMemoryLedger {
    private readonly results = new Map<string, AgentResult>();

    async begin(key: string): Promise<AgentResult | undefined> {
        return this.results.get(key);
    }

    async complete(key: string, result: AgentResult): Promise<void> {
        this.results.set(key, result);
    }
}

class ComposedExecutor implements WorkflowStepExecutor {
    private readonly ledger = new InMemoryLedger();

    constructor(private readonly composition: ProductionActuatorComposition) {}

    async execute(step: WorkflowStep): Promise<AgentResult> {
        const key = `e2e:${step.workflowId}:${step.id}`;
        const recovered = await this.ledger.begin(key);
        if (recovered) return recovered;

        const dispatch = await this.composition.dispatch(step);
        const result = dispatch.result ?? {
            success: false,
            summary: dispatch.reason ?? "Actuation blocked.",
            completedAt: new Date().toISOString(),
            executionStatus: "blocked",
            executed: false,
            verified: false,
        };

        await this.ledger.complete(key, result);
        return result;
    }
}

const executedSteps: string[] = [];

const registry = new InMemoryProductionActuatorRegistry();
registry.register({
    id: "e2e-email-actuator",
    capabilities: ["email.send"],
    async execute(step) {
        executedSteps.push(step.id);
        return {
            success: true,
            summary: "Composed actuator reached the terminal execution adapter.",
            completedAt: new Date().toISOString(),
            executionStatus: "verified",
            executed: true,
            verified: true,
            evidence: {
                provider: "e2e-test-provider",
                externalId: `e2e-${step.id}`,
            },
        };
    },
});

const composition = new ProductionActuatorComposition(registry);
const executor = new ComposedExecutor(composition);
const orchestrator = new WorkflowOrchestrator(undefined, executor);

function workflow(id: string, step: WorkflowStep): Workflow {
    return {
        id,
        name: "V8 production actuator E2E",
        description: "End-to-end validation of workflow orchestration through V6 and production actuator composition.",
        steps: [step],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

async function main(): Promise<void> {
    const step: WorkflowStep = {
        id: "e2e-email-step",
        workflowId: "e2e-workflow",
        title: "Execute email capability",
        description: "Controlled E2E actuator execution.",
        agentId: "sales",
        capability: "email.send",
        dependsOn: [],
        priority: Priority.MEDIUM,
        requiresApproval: false,
        status: "READY",
    };

    const first = await orchestrator.runReadySteps(
        workflow("e2e-workflow", step),
    );

    if (first.executedStepIds[0] !== step.id) {
        throw new Error("E2E workflow did not record executed step.");
    }

    if (executedSteps.length !== 1) {
        throw new Error("E2E actuator was not reached exactly once.");
    }

    const result = first.results[step.id];
    if (!result?.executed || !result.verified) {
        throw new Error("E2E execution did not produce verified reality.");
    }

    const blockedStep: WorkflowStep = {
        ...step,
        id: "e2e-approval-blocked",
        requiresApproval: true,
        status: "READY",
    };

    const blocked = await orchestrator.runReadySteps(
        workflow("e2e-blocked-workflow", blockedStep),
    );

    if (blocked.executedStepIds.length !== 0) {
        throw new Error("Approval-required E2E step crossed the actuation boundary.");
    }

    if (blocked.results[blockedStep.id]?.executionStatus !== "blocked") {
        throw new Error("Approval-required E2E step was not blocked.");
    }

    console.log("");
    console.log("V8 — END-TO-END ACTUATION VALIDATION");
    console.log("Workflow → V6 → actuator : PASS");
    console.log("Verified execution        : PASS");
    console.log("Exactly-once dispatch     : PASS");
    console.log("Approval boundary         : PASS");
    console.log("Terminal execution count :", executedSteps.length);
    console.log("V8 E2E ACTUATION: PASS");
}

void main();
