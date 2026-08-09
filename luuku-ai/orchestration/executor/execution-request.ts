import { Agent } from "../agent";
import { Task } from "../task";

export interface ExecutionRequest {

    task: Task;

    agent: Agent;

}