import { CollaborationRequest } from "./request";

import { CollaborationResponse } from "./response";

export interface RequestHandler {

    handle(

        request: CollaborationRequest

    ): Promise<CollaborationResponse>;

}