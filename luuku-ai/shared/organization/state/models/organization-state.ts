import { RuntimeState } from "./runtime-state";
import { QueueState } from "./queue-state";
import { WorkerSummary } from "./worker-summary";
import { OrganizationHealth } from "./organization-health";
import { OrganizationMetrics } from "./organization-metrics";

export interface OrganizationState {

    runtime: RuntimeState;

    workers: WorkerSummary;

    queue: QueueState;

    health: OrganizationHealth;

    metrics: OrganizationMetrics;

    generatedAt: string;

}