import {

    useEffect,

    useState,

} from "react";

import {

    createExecutionPlan,

} from "../services/planner.service";

import type {

    ExecutionPlan,

} from "../types/plan";

export function usePlanner(

    goal: string

) {

    const [

        plan,

        setPlan,

    ] =

    useState<ExecutionPlan | null>(null);

    useEffect(() => {

        createExecutionPlan(

            goal

        ).then(

            setPlan

        );

    }, [goal]);

    return plan;

}