import { getTasks } from "../services/task";
import { loadTasks } from "../scheduler/tasks";

export interface ExecutiveAnalytics {

    totalTasks: number;

    overdueTasks: number;

    completedTasks: number;

    activeTasks: number;

}

export function buildAnalytics(): ExecutiveAnalytics {

    const tasks = getTasks();

    return {

        totalTasks: tasks.length,

        overdueTasks: tasks.filter(task =>

            task.status !== "completed" &&
            task.status !== "archived" &&
            new Date(task.dueDate) < new Date()

        ).length,

        completedTasks: tasks.filter(task =>

            task.status === "completed"

        ).length,

        activeTasks: tasks.filter(task =>

            task.status === "assigned" ||
            task.status === "in-progress"

        ).length

    };

}