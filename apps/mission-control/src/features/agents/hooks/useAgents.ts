import { useEffect, useState } from "react";

import type { Agent } from "@/features/agents/types/agent";

import { getAgents } from "../api/agent.api";

export function useAgents() {

    const [agents, setAgents] =

        useState<Agent[]>([]);

    useEffect(() => {

        async function loadAgents() {

            try {

                const data =

                    await getAgents();

                setAgents(data);

            } catch (error) {

                console.error(

                    "Failed to load agents.",

                    error

                );

            }

        }

        loadAgents();

        const timer =

            setInterval(

                loadAgents,

                5000

            );

        return () =>

            clearInterval(timer);

    }, []);

    return agents;

}