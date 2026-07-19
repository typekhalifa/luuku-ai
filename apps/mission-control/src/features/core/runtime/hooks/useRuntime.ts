import {

    useEffect,

    useState,

} from "react";

import {

    getRuntimeAgents,

} from "../services/runtime.service";

import type {

    RuntimeAgent,

} from "../types/runtime";

export function useRuntime() {

    const [

        agents,

        setAgents,

    ] =

    useState<RuntimeAgent[]>([]);

    useEffect(() => {

        getRuntimeAgents()

            .then(setAgents);

    }, []);

    return agents;

}