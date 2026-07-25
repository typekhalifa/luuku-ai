import { useEffect, useState } from "react";

import { eventClient } from "@/sdk/events";

import type { LuukuEvent } from "../types";

export function useEvents() {

    const [data, setData] =
        useState<LuukuEvent[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<Error | null>(null);

    useEffect(() => {

        eventClient
            .getEvents()
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