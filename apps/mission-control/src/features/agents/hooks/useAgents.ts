import { useEffect, useState } from "react";

import type { Agent } from "@/features/agents/types/agent";

import { agentClient } from "@/sdk/agents/agent.client";

export function useAgents() {

    const [data, setData] =
        useState<Agent[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<Error | null>(null);

    useEffect(() => {

        async function loadAgents() {

            try {

                const agents =
                    await agentClient.getAgents();

                setData(agents);

            } catch (err) {

                setError(err as Error);

            } finally {

                setLoading(false);

            }

        }

        loadAgents();

        const timer =
            setInterval(loadAgents, 5000);

        return () =>
            clearInterval(timer);

    }, []);

    return {

        data,

        loading,

        error,

    };

}