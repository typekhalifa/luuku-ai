import {

    Cpu,

} from "lucide-react";

import {

    Card,

} from "@/shared/components/ui";

import {

    useScheduler,

} from "../hooks/useScheduler";

export default function SchedulerCard() {

    const scheduler = useScheduler();

    return (

        <Card className="p-6">

            <div className="mb-5 flex items-center gap-3">

                <Cpu className="text-violet-400" />

                <h2 className="text-xl font-semibold">

                    Scheduler

                </h2>

            </div>

            <div className="space-y-3">

                <div>

                    <div className="text-sm text-neutral-500">

                        Active Agent

                    </div>

                    <div className="font-medium">

                        {

                            scheduler.activeAgent ??

                            "Idle"

                        }

                    </div>

                </div>

                <div>

                    <div className="text-sm text-neutral-500">

                        Status

                    </div>

                    <div>

                        {

                            scheduler.running

                                ? "Running"

                                : "Waiting"

                        }

                    </div>

                </div>

            </div>

        </Card>

    );

}