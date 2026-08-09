import { Executor } from "./executor";
import { ExecutionRequest } from "./execution-request";
import { ExecutionResult } from "./execution-result";

export class DefaultExecutor implements Executor {

    async execute(

        request: ExecutionRequest,

    ): Promise<ExecutionResult> {

        const result = await request.agent.execute(
            request.task,
        );

        return {

            result,

        };

    }

}