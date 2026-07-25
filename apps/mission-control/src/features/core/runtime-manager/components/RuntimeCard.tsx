import { Cpu } from "lucide-react";

import { Card } from "@/shared/components/ui";

import { useRuntimeManager } from "../hooks/useRuntimeManager";

export default function RuntimeCard() {

    const runtime = useRuntimeManager();

    return (

        <Card className="p-6">

            <div className="mb-6 flex items-center gap-3">

                <Cpu className="text-violet-400" />

                <h2 className="text-xl font-semibold">

                    Runtime

                </h2>

            </div>

            <div className="space-y-5">

                <div>

                    <div className="text-sm text-neutral-500">

                        Active Agent

                    </div>

                    <div className="font-medium">

                        {runtime.activeAgent ?? "Idle"}

                    </div>

                </div>

                <div>

                    <div className="text-sm text-neutral-500">

                        Current Task

                    </div>

                    <div>

                        {runtime.currentTask ?? "Waiting"}

                    </div>

                </div>

                <div>

                    <div className="text-sm text-neutral-500">

                        Runtime Status

                    </div>

                    <div>

                        {runtime.status}

                    </div>

                </div>

            </div>

        </Card>

    );

}