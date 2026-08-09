import { TaskItem } from "./task-item";

export interface TaskQueue {

    enqueue(

        task: TaskItem

    ): Promise<void>;

    dequeue(): Promise<TaskItem | undefined>;

    peek(): Promise<TaskItem | undefined>;

    size(): Promise<number>;

}