import { useEffect, useState } from "react";

import { workflowClient } from "@/sdk/workflow";

import type { Workflow } from "../types";

export function useWorkflow() {

    const [data, setData] =
        useState<Workflow[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<Error | null>(null);

    useEffect(() => {

        workflowClient
            .getWorkflows()
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