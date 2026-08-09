import { OrganizationState } from "../models/organization-state";
import { RuntimeState } from "../models/runtime-state";
import { QueueState } from "../models/queue-state";
import { WorkerSummary } from "../models/worker-summary";
import { OrganizationHealth } from "../models/organization-health";
import { OrganizationMetrics } from "../models/organization-metrics";

export class OrganizationStateComposer {

    compose(

        runtime: RuntimeState,

        queue: QueueState,

        workers: WorkerSummary,

        health: OrganizationHealth,

        metrics: OrganizationMetrics

    ): OrganizationState {

        return {

            runtime,

            queue,

            workers,

            health,

            metrics,

            generatedAt: new Date().toISOString()

        };

    }

}