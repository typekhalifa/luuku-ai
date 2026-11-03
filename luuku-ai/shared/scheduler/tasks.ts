import fs from "fs";
import path from "path";
import { Task } from "../types/task";

const TASK_FOLDER = path.join(
    process.cwd(),
    "luuku-ai",
    "memory",
    "tasks"
);

function ensureTaskFolder() {
    if (!fs.existsSync(TASK_FOLDER)) {
        fs.mkdirSync(TASK_FOLDER, { recursive: true });
    }
}

export function saveTask(task: Task): Task {
    ensureTaskFolder();

    const filePath = path.join(
        TASK_FOLDER,
        `${task.id}.json`
    );

    // Replaying the same task identity returns the original task
    // instead of overwriting its status or creating duplicate work.
    if (fs.existsSync(filePath)) {
        return JSON.parse(
            fs.readFileSync(filePath, "utf8")
        ) as Task;
    }

    try {
        fs.writeFileSync(
            filePath,
            JSON.stringify(task, null, 2),
            {
                encoding: "utf8",
                flag: "wx"
            }
        );

        return task;
    } catch (error) {
        // Another process may have created this stable task ID
        // between the existence check and exclusive file creation.
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "EEXIST"
        ) {
            return JSON.parse(
                fs.readFileSync(filePath, "utf8")
            ) as Task;
        }

        throw error;
    }
}

export function loadTasks(): Task[] {
    if (!fs.existsSync(TASK_FOLDER)) {
        return [];
    }

    const files = fs
        .readdirSync(TASK_FOLDER)
        .filter(file => file.endsWith(".json"));

    return files.map(file => {
        const fullPath = path.join(TASK_FOLDER, file);

        return JSON.parse(
            fs.readFileSync(fullPath, "utf8")
        ) as Task;
    });
}
