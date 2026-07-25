import { useEffect, useState } from "react";

import { runtimeClient } from "@/sdk/runtime";

import {
    getRuntime,
    setRuntime,
} from "../services/runtime.service";

export function useRuntimeManager() {

    const [runtime, setRuntimeState] = useState(getRuntime());

    useEffect(() => {

        async function syncRuntime() {

            try {

                const latest = await runtimeClient.getStatus();

                setRuntime(latest);

                setRuntimeState(getRuntime());

            } catch (error) {

                console.error("Failed to sync runtime:", error);

            }

        }

        syncRuntime();

        const timer = setInterval(syncRuntime, 3000);

        return () => clearInterval(timer);

    }, []);

    return runtime;

}