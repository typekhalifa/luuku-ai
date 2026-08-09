import { OrganizationStateProvider } from "../interfaces/organization-state-provider";

import { OrganizationState } from "../models/organization-state";
import { RuntimeState } from "../models/runtime-state";
import { QueueState } from "../models/queue-state";
import { WorkerSummary } from "../models/worker-summary";
import { OrganizationHealth } from "../models/organization-health";
import { OrganizationMetrics } from "../models/organization-metrics";

import { buildOrganizationState } from "../builders/organization-state-builder";

export class InMemoryOrganizationState
    implements OrganizationStateProvider {

    private state: OrganizationState;

    constructor() {

        this.state = buildOrganizationState();

    }

    getState(): OrganizationState {

        return this.state;

    }

    setState(
        state: OrganizationState
    ): void {

        this.state = state;

        this.touch();

    }

    updateRuntime(
        runtime: RuntimeState
    ): void {

        this.state.runtime = runtime;

        this.touch();

    }

    updateQueue(
        queue: QueueState
    ): void {

        this.state.queue = queue;

        this.touch();

    }

    updateWorkers(
        workers: WorkerSummary
    ): void {

        this.state.workers = workers;

        this.touch();

    }

    updateHealth(
        health: OrganizationHealth
    ): void {

        this.state.health = health;

        this.touch();

    }

    updateMetrics(
        metrics: OrganizationMetrics
    ): void {

        this.state.metrics = metrics;

        this.touch();

    }

    reset(): void {

        this.state = buildOrganizationState();

    }

    private touch(): void {

        this.state.generatedAt =

            new Date().toISOString();

    }

}