import { RoutingRequest } from "./routing-request";
import { RoutingResult } from "./routing-result";

export interface Router {

    route(

        request: RoutingRequest,

    ): Promise<RoutingResult>;

}