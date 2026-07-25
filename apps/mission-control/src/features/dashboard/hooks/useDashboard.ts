import { useEffect, useState } from "react";
import { dashboardClient } from "@/sdk/dashboard/dashboard.client";
import type { DashboardOverview } from "@/sdk/types/dashboard";

export function useDashboard() {
    const [data, setData] = useState<DashboardOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        dashboardClient
            .getOverview()
            .then(setData)
            .catch((err) => setError(err as Error))
            .finally(() => setLoading(false));
    }, []);

    return { data, loading, error };
}