export type HealthStatus =
    | "healthy"
    | "warning"
    | "critical";

export interface OrganizationHealth {

    score: number;

    status: HealthStatus;

}