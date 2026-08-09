import { ExecutionRequest } from "./execution-request";
import { ExecutionResult } from "./execution-result";

export interface Executor {

    execute(

        request: ExecutionRequest,

    ): Promise<ExecutionResult>;

}