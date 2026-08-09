import {

    CollaborationService

} from "./collaboration-service";

import {

    CollaborationRequest,

    CollaborationResponse

} from "./requests";

import {

    CollaborationEvent,

    EventBus

} from "./events";

export class InMemoryCollaborationService

    implements CollaborationService {

    constructor(

        private readonly eventBus: EventBus

    ) {}

    async request<TRequest = unknown, TResponse = unknown>(

        request: CollaborationRequest<TRequest>

    ): Promise<CollaborationResponse<TResponse>> {

        console.log("");

        console.log("========================================");

        console.log("   COLLABORATION REQUEST");

        console.log("========================================");

        console.log("");

        console.log(request);

        return {

            requestId:

                request.id,

            responder:

                request.target,

            success:

                true,

            payload:

                {} as TResponse,

            completedAt:

                new Date().toISOString()

        };

    }

    async publish<T = unknown>(

        event: CollaborationEvent<T>

    ): Promise<void> {

        await this.eventBus.publish(

            event

        );

    }

}