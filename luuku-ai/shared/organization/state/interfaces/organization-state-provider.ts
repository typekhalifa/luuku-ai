import { OrganizationState } from "../models/organization-state";
import { RuntimeState } from "../models/runtime-state";
import { QueueState } from "../models/queue-state";
import { WorkerSummary } from "../models/worker-summary";
import { OrganizationHealth } from "../models/organization-health";
import { OrganizationMetrics } from "../models/organization-metrics";

export interface OrganizationStateProvider {

    getState(): OrganizationState;

    setState(
        state: OrganizationState
    ): void;

    updateRuntime(
        runtime: RuntimeState
    ): void;

    updateQueue(
        queue: QueueState
    ): void;

    updateWorkers(
        workers: WorkerSummary
    ): void;

    updateHealth(
        health: OrganizationHealth
    ): void;

    updateMetrics(
        metrics: OrganizationMetrics
    ): void;

    reset(): void;

}