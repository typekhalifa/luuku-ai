import { BrainCircuit, ArrowDown } from "lucide-react";

import { Card } from "@/shared/components/ui";

import { usePlanner } from "../hooks/usePlanner";
import { useExecution } from "@/features/core/execution";

export default function PlannerPreview() {

    const plan = usePlanner(
        "Acquire 100 new customers"
    );

    const {
        running,
        run,
    } = useExecution();

    if (!plan) return null;

    return (

        <Card className="p-6">

            <div className="mb-6 flex items-center gap-3">

                <BrainCircuit className="text-violet-400" />

                <h2 className="text-xl font-semibold">

                    Planner

                </h2>

            </div>

            <p className="text-sm text-neutral-400">

                Goal

            </p>

            <h3 className="mb-6 text-lg font-medium">

                {plan.goal}

            </h3>

            <div className="space-y-4">

                {plan.steps.map((step) => (

                    <div
                        key={step.id}
                        className="rounded-xl border border-white/10 p-4"
                    >

                        <div className="font-medium">

                            {step.title}

                        </div>

                        <div className="text-sm text-neutral-500">

                            {step.assignedTo}

                        </div>

                        <ArrowDown
                            size={16}
                            className="mt-3 text-neutral-600"
                        />

                    </div>

                ))}

            </div>

            <button
                onClick={() => run(plan)}
                disabled={running}
                className="mt-6 w-full rounded-xl bg-violet-600 px-5 py-3 font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >

                {running
                    ? "Executing..."
                    : "Execute Plan"}

            </button>

        </Card>

    );

}