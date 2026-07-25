export interface PlanStep {
  id: string;
  title: string;
  status?: string;
}

export interface CreatePlanRequest {
  goal: string;
  agent?: string;
}

export interface PlanResponse {
  planId: string;
  status: string;
  steps: PlanStep[];
}