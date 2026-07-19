import type { QueueTask } from "@/features/core/queue";

type Listener = (tasks: QueueTask[]) => void;

export class QueueEngine {

    private tasks: QueueTask[] = [];

    private listeners: Listener[] = [];

    subscribe(listener: Listener) {

        this.listeners.push(listener);

        listener([...this.tasks]);

    }

    private emit() {

        this.listeners.forEach(listener =>

            listener([...this.tasks])

        );

    }

    enqueue(tasks: QueueTask[]) {

        this.tasks = tasks.map(task => ({

            ...task,

            status: "queued",

            progress: 0,

        }));

        this.emit();

        this.run();

    }

    private async run() {

        for (const task of this.tasks) {

            task.status = "running";

            this.emit();

            for (

                let progress = 0;

                progress <= 100;

                progress += 10

            ) {

                task.progress = progress;

                this.emit();

                await new Promise(resolve =>

                    setTimeout(resolve, 250)

                );

            }

            task.status = "completed";

            this.emit();

        }

    }

}

export const queueEngine = new QueueEngine();