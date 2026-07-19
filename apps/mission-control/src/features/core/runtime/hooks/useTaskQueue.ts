import {
  useEffect,
  useState,
} from "react";

import {
  getRuntimeTasks,
} from "../services/task.service";

import type {
  RuntimeTask,
} from "../types/task";

export function useTaskQueue() {

  const [
    tasks,
    setTasks,
  ] = useState<RuntimeTask[]>([]);

  useEffect(() => {

    getRuntimeTasks()

      .then(setTasks);

  }, []);

  return tasks;

}