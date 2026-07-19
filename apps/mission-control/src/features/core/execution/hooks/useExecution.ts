import { useState } from "react";

import { executePlan }
from "../services/execution.service";

import type { ExecutionPlan }
from "@/features/core/planner/types/plan";

export function useExecution() {

    const [

        running,

        setRunning,

    ] = useState(false);

    async function run(

        plan: ExecutionPlan

    ) {

        setRunning(true);

        await executePlan(plan);

        setRunning(false);

    }

    return {

        running,

        run,

    };

}