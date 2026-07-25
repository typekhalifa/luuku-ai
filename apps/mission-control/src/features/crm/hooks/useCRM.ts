import { useEffect, useState } from "react";

import { crmClient } from "@/sdk/crm";

import type { CRMOverview } from "../types";

export function useCRM() {

    const [data, setData] =
        useState<CRMOverview | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<Error | null>(null);

    useEffect(() => {

        crmClient
            .getOverview()
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