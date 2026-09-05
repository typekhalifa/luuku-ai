import type { QueueStore } from "../../orchestration/queue/queue.js";
import type { WorkflowStepExecutor } from "../../orchestration/workflow/workflow-orchestrator.js";
import type { WorkflowStore } from "../../orchestration/workflow/workflow-store.js";
import type { CapabilityResolver } from "../planning/capability-resolver.js";
import type { IntentPlanCapabilityMap } from "../planning/intent-plan-builder.js";
import type { AutonomyPolicyRule } from "./autonomy-policy.js";
import { AutonomousExecutiveCycle, type AutonomousExecutiveCycleOptions } from "./autonomous-executive-cycle.js";
import type { ExecutiveMemoryStore } from "./executive-memory.js";
import type { ExecutiveLoopCheckpointStore } from "./executive-loop-checkpoint.js";
import type { ExecutiveObjectiveStore } from "./objective-engine.js";
import { PersistentExecutiveLoop, type PersistentExecutiveLoopOptions } from "./persistent-executive-loop.js";
import { PersistentExecutiveService, type PersistentExecutiveServiceOptions } from "./persistent-executive-service.js";

/**
 * Explicit dependency boundary for the production executive.
 *
 * The composition root owns wiring; individual executive modules own their
 * domain behavior. Durable implementations should be supplied by the caller.
 */
export interface ExecutiveCompositionDependencies {
    readonly workflowStore: WorkflowStore;
    readonly queueStore: QueueStore;
    readonly capabilityResolver: CapabilityResolver;
    readonly objectiveStore: ExecutiveObjectiveStore;
    readonly memoryStore: ExecutiveMemoryStore;
    readonly checkpointStore: ExecutiveLoopCheckpointStore;
    readonly capabilities: IntentPlanCapabilityMap;
    readonly policyRules: readonly AutonomyPolicyRule[];
    readonly workflowExecutor?: WorkflowStepExecutor;
    readonly executeRuntime?: boolean;
    readonly maxCycles?: number;
    readonly intervalMs: number;
    readonly runImmediately?: boolean;
    readonly onError?: (error: unknown) => void | Promise<void>;
}

export interface ExecutiveComposition {
    readonly cycle: AutonomousExecutiveCycle;
    readonly loop: PersistentExecutiveLoop;
    readonly service: PersistentExecutiveService;
}

/** Builds the complete executive process without moving execution authority out of V6. */
export function createExecutiveComposition(
    dependencies: ExecutiveCompositionDependencies,
): ExecutiveComposition {
    const cycleOptions: AutonomousExecutiveCycleOptions = {
        capabilities: dependencies.capabilities,
        policyRules: dependencies.policyRules,
        executeRuntime: dependencies.executeRuntime,
        workflowExecutor: dependencies.workflowExecutor,
        objectiveStore: dependencies.objectiveStore,
        memoryStore: dependencies.memoryStore,
    };

    const cycle = new AutonomousExecutiveCycle(
        dependencies.workflowStore,
        dependencies.queueStore,
        dependencies.capabilityResolver,
        cycleOptions,
    );

    const loopOptions: PersistentExecutiveLoopOptions = {
        cycle: cycleOptions,
        checkpointStore: dependencies.checkpointStore,
        maxCycles: dependencies.maxCycles,
    };

    const loop = new PersistentExecutiveLoop(cycle, dependencies.checkpointStore);

    const serviceOptions: PersistentExecutiveServiceOptions = {
        loop,
        loopOptions,
        intervalMs: dependencies.intervalMs,
        runImmediately: dependencies.runImmediately,
        onError: dependencies.onError,
    };

    const service = new PersistentExecutiveService(serviceOptions);

    return { cycle, loop, service };
}
