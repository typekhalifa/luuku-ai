import assert from "node:assert/strict";
import { prisma } from "../../../shared/database/client.js";
import type { AgentResult } from "../../../shared/agents/interface.js";
import { listCompanyObservabilityEvents, getCompanyObservabilityDashboard } from "../../../shared/observability/durable-events.js";
import { ExecutionLedger, workflowStepIdempotencyKey } from "../execution-ledger.js";
import { ProductionActuatorComposition, InMemoryProductionActuatorRegistry, type ProductionActuator } from "../production-actuator.js";
import { V6ActuationBoundaryEngine } from "../v6-actuation-boundary.js";
import { AutonomousRuntime } from "../../workflow/autonomous-runtime.js";
import { WorkflowOrchestrator, type WorkflowStepExecutor } from "../../workflow/workflow-orchestrator.js";
import { WorkflowStatus } from "../../workflow/workflow-status.js";
import type { Workflow } from "../../workflow/workflow.js";
import type { WorkflowStep } from "../../workflow/workflow-step.js";
import { Priority } from "../../task/priority.js";
import { InMemoryQueueStore, QueueItemStatus } from "../../queue/queue.js";
import { QueueScheduler } from "../../scheduler/scheduler.js";
import type { ExecutionOwnership } from "../../ownership.js";

const source = "v8.13-v6-runtime-proof";

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitFor(check: () => Promise<boolean>, timeoutMs = 5000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await check()) return;
        await sleep(100);
    }
    throw new Error("Timed out waiting for V6 runtime observability evidence.");
}

class DurableV6Executor implements WorkflowStepExecutor {
    constructor(
        private readonly ledger: ExecutionLedger,
        private readonly actuators: ProductionActuatorComposition,
    ) {}

    async execute(step: WorkflowStep): Promise<AgentResult> {
        const workflowId = step.workflowId;
        if (!workflowId || !step.ownership) {
            throw new Error("V6 runtime proof requires workflow identity and ownership.");
        }

        const key = workflowStepIdempotencyKey(workflowId, step.id);
        const claim = await this.ledger.begin(key, workflowId, step.id, step.ownership);

        if (claim.status === "executing" && !claim.result) {
            return {
                success: false,
                summary: "Durable execution requires reconciliation before retry.",
                completedAt: new Date().toISOString(),
                executionStatus: "blocked",
                executed: false,
                verified: false,
            };
        }

        if (claim.status === "completed" && claim.result) return claim.result;

        const dispatch = await this.actuators.dispatch(step);
        const result = dispatch.result ?? {
            success: false,
            summary: dispatch.reason ?? "V6 actuation was blocked.",
            completedAt: new Date().toISOString(),
            executionStatus: "blocked",
            executed: false,
            verified: false,
        };

        await this.ledger.complete(key, result);
        return result;
    }
}

function makeWorkflow(id: string, ownership: ExecutionOwnership, step: WorkflowStep): Workflow {
    return {
        id,
        ownership,
        goal: "V8.13 prove the canonical V6 runtime path",
        status: WorkflowStatus.READY,
        steps: [step],
        requiresFounderApproval: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { source },
    };
}

async function main(): Promise<void> {
    const suffix = Date.now().toString();
    const company = await prisma.company.create({
        data: {
            name: `V8.13 V6 Runtime Proof ${suffix}`,
            industry: "test",
            country: "Rwanda",
            status: "prospect",
            confidence: 100,
            verified: false,
            source,
        },
    });

    const ownership: ExecutionOwnership = {
        scope: "COMPANY",
        companyId: company.id,
    };

    let actuatorCalls = 0;
    const registry = new InMemoryProductionActuatorRegistry();
    const controlledActuator: ProductionActuator = {
        id: "v8.13-controlled-actuator",
        capabilities: ["runtime.proof"],
        async execute(step) {
            actuatorCalls += 1;
            return {
                success: true,
                summary: "Canonical V6 runtime reached the controlled terminal adapter.",
                completedAt: new Date().toISOString(),
                executionStatus: "verified",
                executed: true,
                verified: true,
                evidence: {
                    provider: "v8.13-controlled-provider",
                    externalId: `runtime-proof-${step.id}`,
                },
            };
        },
    };
    registry.register(controlledActuator);

    const composition = new ProductionActuatorComposition(
        registry,
        new V6ActuationBoundaryEngine(),
    );
    const ledger = new ExecutionLedger();
    const executor = new DurableV6Executor(ledger, composition);
    const orchestrator = new WorkflowOrchestrator(undefined, executor);
    const queue = new InMemoryQueueStore(ownership);
    const scheduler = new QueueScheduler(queue);
    const runtime = new AutonomousRuntime(scheduler, queue, orchestrator);

    const workflowId = `v8.13-runtime-${suffix}`;
    const stepId = "canonical-runtime-step";
    const step: WorkflowStep = {
        id: stepId,
        workflowId: workflowId,
        ownership,
        title: "Execute controlled runtime proof",
        description: "Exercise Scheduler → Queue → AutonomousRuntime → V6 → Actuator.",
        agentId: "runtime-proof",
        capability: "runtime.proof",
        dependsOn: [],
        priority: Priority.HIGH,
        requiresApproval: false,
        status: "READY",
    };
    const workflow = makeWorkflow(workflowId, ownership, step);

    try {
        const first = await runtime.runCycle(workflow);

        assert.deepEqual(first.claimed, [`${workflowId}:${stepId}`]);
        assert.deepEqual(first.executed, [stepId]);
        assert.deepEqual(first.completed, [`${workflowId}:${stepId}`]);
        assert.equal(workflow.steps[0].status, "COMPLETED");
        assert.equal(actuatorCalls, 1);

        const queueItem = await queue.get(`${workflowId}:${stepId}`);
        assert.equal(queueItem?.status, QueueItemStatus.COMPLETED);

        await waitFor(async () => {
            const events = await listCompanyObservabilityEvents({
                companyId: company.id,
                from: new Date(Date.now() - 60_000),
                to: new Date(),
                limit: 100,
            });
            return events.some(event => event.eventType === "execution.succeeded");
        });

        const dashboard = await getCompanyObservabilityDashboard(
            company.id,
            new Date(Date.now() - 60_000),
            new Date(),
        );
        assert.equal(dashboard.executions.started, 1);
        assert.equal(dashboard.executions.succeeded, 1);
        assert.equal(dashboard.executions.failed, 0);
        assert.equal(dashboard.providers.succeeded, 1);

        const trace = await listCompanyObservabilityEvents({
            companyId: company.id,
            executionId: (await prisma.communicationExecution.findUnique({
                where: { idempotencyKey: workflowStepIdempotencyKey(workflowId, stepId) },
            }))?.id,
            limit: 100,
        });
        assert.deepEqual(
            trace.map(event => event.eventType).sort(),
            ["execution.started", "execution.succeeded", "provider.succeeded"].sort(),
        );

        const replay = await runtime.runCycle(workflow);
        assert.equal(replay.claimed.length, 0);
        assert.equal(replay.executed.length, 0);
        assert.equal(actuatorCalls, 1);

        const approvalStep: WorkflowStep = {
            ...step,
            id: "approval-boundary-step",
            status: "READY",
            requiresApproval: true,
        };
        const blocked = await composition.dispatch({
            ...approvalStep,
            workflowId: `${workflowId}-approval`,
        });
        assert.equal(blocked.allowed, false);
        assert.equal(blocked.boundary, "V6_EXECUTION_AUTHORITY");
        assert.equal(actuatorCalls, 1);

        console.log("");
        console.log("========================================");
        console.log(" V8.13 CANONICAL V6 RUNTIME PROOF");
        console.log("========================================");
        console.log("");
        console.log("Scheduler → Queue           : PASS");
        console.log("AutonomousRuntime cycle     : PASS");
        console.log("V6 actuation boundary      : PASS");
        console.log("Controlled actuator reached : PASS");
        console.log("Durable execution ledger   : PASS");
        console.log("Durable observability trace : PASS");
        console.log("Mission Control metrics    : PASS");
        console.log("Exactly-once replay safety : PASS");
        console.log("Approval boundary          : PASS");
        console.log("");
        console.log("V8.13 CANONICAL V6 RUNTIME PROOF: PASS");
    } finally {
        await prisma.observabilityEvent.deleteMany({ where: { source } });
        await prisma.communicationExecution.deleteMany({
            where: { idempotencyKey: { startsWith: `luuku:v6:workflow:${workflowId}:` } },
        });
        await prisma.company.delete({ where: { id: company.id } });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
