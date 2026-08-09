import { Priority } from "../task";

export interface PlanningRequest {

    goal: string;

    priority: Priority;

    context: Record<string, unknown>;

    constraints: Record<string, unknown>;

}