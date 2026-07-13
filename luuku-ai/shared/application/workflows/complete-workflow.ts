import { WorkflowContext } from "./workflow-context";

export function completeWorkflow(

    context: WorkflowContext

): void {

    context.completedAt =

        new Date();

    context.durationMs =

        context.completedAt.getTime()

        -

        context.startedAt.getTime();

}