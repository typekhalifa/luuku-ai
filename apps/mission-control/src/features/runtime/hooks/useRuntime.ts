import { useEffect, useState } from "react";

import { runtimeClient } from "@/sdk/runtime";

import type { RuntimeStatus } from "../types";

export function useRuntime() {

    const [data, setData] =
        useState<RuntimeStatus | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<Error | null>(null);

    useEffect(() => {

        runtimeClient
            .getStatus()
            .then(setData)
            .catch((err) => setError(err as Error))
            .finally(() => setLoading(false));

    }, []);

    return {

        data,

        loading,

        error,

    };

}