import { Plan } from "./plan";
import { PlanningRequest } from "./planning-request";

export interface Planner {

    create(

        request: PlanningRequest,

    ): Promise<Plan>;

}