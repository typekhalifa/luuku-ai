import { api } from "../client/api";
import type {
  CreatePlanRequest,
  PlanResponse,
} from "../types/planner";

export class PlannerClient {
  createPlan(request: CreatePlanRequest) {
    return api.post<PlanResponse>(
      "/planner/plan",
      request,
    );
  }
}

export const plannerClient =
  new PlannerClient();