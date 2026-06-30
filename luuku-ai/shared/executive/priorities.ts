import { getTasks } from "../services/task";
import { Task } from "../types/task";

export function getHighestPriorityTask(): Task | null {

    const tasks = getTasks();

    const active = tasks.filter(task =>

        task.status !== "completed" &&
        task.status !== "archived" &&
        task.status !== "cancelled"

    );

    if (active.length === 0) {

        return null;

    }

    active.sort((a, b) => {

        const score = {

            high: 3,

            medium: 2,

            low: 1

        };

        return score[b.priority] - score[a.priority];

    });

    return active[0];

}