import fs from "fs";
import path from "path";
import { Task } from "../types/task";

const TASK_FOLDER = path.join(
    process.cwd(),
    "luuku-ai",
    "memory",
    "tasks"
);

export function saveTask(task: Task) {

    if (!fs.existsSync(TASK_FOLDER)) {

        fs.mkdirSync(TASK_FOLDER, {
            recursive: true
        });

    }

    const filename =
        task.id + ".json";

    fs.writeFileSync(

        path.join(TASK_FOLDER, filename),

        JSON.stringify(task, null, 2)

    );

}

export function loadTasks(): Task[] {

    if (!fs.existsSync(TASK_FOLDER))
        return [];

    const files = fs
        .readdirSync(TASK_FOLDER)
        .filter(file => file.endsWith(".json"));

    return files.map(file => {

        const fullPath = path.join(
            TASK_FOLDER,
            file
        );

        return JSON.parse(
            fs.readFileSync(
                fullPath,
                "utf8"
            )
        );

    });

}