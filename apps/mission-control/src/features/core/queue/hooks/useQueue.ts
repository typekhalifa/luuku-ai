import { useEffect, useState } from "react";

import type { QueueTask } from "../types/queue";

import {

    queueEngine,

} from "@/features/core/engine";

export function useQueue() {

    const [

        tasks,

        setTasks,

    ] = useState<QueueTask[]>([]);

    useEffect(() => {

        queueEngine.subscribe(

            setTasks

        );

    }, []);

    return tasks;

}