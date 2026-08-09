import { idGenerator } from "../../shared/ids";

import { Plan } from "./plan";
import { Planner } from "./planner";
import { PlanningRequest } from "./planning-request";

export class DefaultPlanner implements Planner {

    async create(

        request: PlanningRequest,

    ): Promise<Plan> {

        return {

            id: idGenerator.generate(),

            goal: request.goal,

            tasks: [],

            metadata: {},

            createdAt: new Date(),

        };

    }

}