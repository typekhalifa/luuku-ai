export interface PlanStep {

    id: string;

    title: string;

    assignedTo: string;

}

export interface ExecutionPlan {

    goal: string;

    steps: PlanStep[];

}