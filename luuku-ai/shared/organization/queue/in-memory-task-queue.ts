import { TaskQueue } from "./task-queue";

import { TaskItem } from "./task-item";

export class InMemoryTaskQueue

    implements TaskQueue {

    private readonly tasks: TaskItem[] = [];

    async enqueue(

        task: TaskItem

    ): Promise<void> {

        this.tasks.push(task);

    }

    async dequeue(): Promise<TaskItem | undefined> {

        return this.tasks.shift();

    }

    async peek(): Promise<TaskItem | undefined> {

        return this.tasks[0];

    }

    async size(): Promise<number> {

        return this.tasks.length;

    }

}