import {

    CollaborationRequest,

    CollaborationResponse

} from "./requests";

import {

    CollaborationEvent

} from "./events";

export interface CollaborationService {

    request<TRequest = unknown, TResponse = unknown>(

        request: CollaborationRequest<TRequest>

    ): Promise<CollaborationResponse<TResponse>>;

    publish<T = unknown>(

        event: CollaborationEvent<T>

    ): Promise<void>;

}