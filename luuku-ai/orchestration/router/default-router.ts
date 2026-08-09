import { AgentRegistry, Capability } from "../agent";
import { Router } from "./router";
import { RoutingRequest } from "./routing-request";
import { RoutingResult } from "./routing-result";
import { taskTypeToCapability } from "./task-type-to-capability";

export class DefaultRouter implements Router {

    constructor(

        private readonly registry: AgentRegistry,

    ) {}

    async route(

        request: RoutingRequest,

    ): Promise<RoutingResult> {

        const capability = taskTypeToCapability(request.task.type);

        const agent = this.registry.findByCapability(capability);

        if (!agent) {

            throw new Error(

                `No agent registered for capability: ${capability}`,

            );

        }

        return {

            task: request.task,

            agent,

        };

    }

}