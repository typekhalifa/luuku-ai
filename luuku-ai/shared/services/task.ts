import { Task } from "../types/task";
import { saveTask, loadTasks } from "../scheduler/tasks";

export function createTask(
    task: Task
): Task {

    saveTask(task);

    return task;

}

export function getTasks(): Task[] {

    return loadTasks();

}

export function assignTask(

    id: string,

    agent: string

): Task | null {

    const tasks = loadTasks();

    const task = tasks.find(
        t => t.id === id
    );

    if (!task)
        return null;

    task.assignedAgent = agent;

    task.status = "assigned";

    saveTask(task);

    return task;

}

export function startTask(
    id: string
): Task | null {

    const tasks = loadTasks();

    const task = tasks.find(
        t => t.id === id
    );

    if (!task)
        return null;

    task.status = "in-progress";

    saveTask(task);

    return task;

}

export function completeTask(
    id: string
): Task | null {

    const tasks = loadTasks();

    const task = tasks.find(
        t => t.id === id
    );

    if (!task)
        return null;

    task.status = "completed";

    task.completedAt =
        new Date().toISOString();

    saveTask(task);

    return task;

}

export function cancelTask(
    id: string
): Task | null {

    const tasks = loadTasks();

    const task = tasks.find(
        t => t.id === id
    );

    if (!task)
        return null;

    task.status = "cancelled";

    saveTask(task);

    return task;

}

export function archiveTask(
    id: string
): Task | null {

    const tasks = loadTasks();

    const task = tasks.find(
        t => t.id === id
    );

    if (!task)
        return null;

    task.status = "archived";

    saveTask(task);

    return task;

}

export function getOverdueTasks(): Task[] {

    const now = new Date();

    return loadTasks().filter(task =>

        task.status !== "completed" &&

        task.status !== "archived" &&

        new Date(task.dueDate) < now

    );

}