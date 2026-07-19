import { useEffect, useState } from "react";

import type { DashboardStats } from "../types/dashboard";

import { getDashboardStats } from "../api/dashboard.api";

export function useDashboard() {

    const [stats, setStats] =
        useState<DashboardStats | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {

        async function loadDashboard() {

            try {

                const data =
                    await getDashboardStats();

                setStats(data);

                setError(null);

            } catch (err) {

                console.error(err);

                setError(
                    "Unable to load dashboard."
                );

            } finally {

                setLoading(false);

            }

        }

        loadDashboard();

        const timer = setInterval(

            loadDashboard,

            5000

        );

        return () => clearInterval(timer);

    }, []);

    return {

        stats,

        loading,

        error

    };

}