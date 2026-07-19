import {
  Bot,
  CheckCircle2,
  Database,
  Workflow,
  BrainCircuit,
  Clock3,
} from "lucide-react";

import { Card } from "@/shared/components/ui";

const events = [
  {
    icon: Bot,
    title: "Executive AI",
    description: "Completed strategic planning.",
    time: "2 sec ago",
    color: "text-violet-400",
  },
  {
    icon: BrainCircuit,
    title: "Research AI",
    description: "Generated competitor report.",
    time: "18 sec ago",
    color: "text-cyan-400",
  },
  {
    icon: Workflow,
    title: "Workflow Engine",
    description: "Executed invoice workflow.",
    time: "31 sec ago",
    color: "text-emerald-400",
  },
  {
    icon: Database,
    title: "Database AI",
    description: "Finished vector synchronization.",
    time: "52 sec ago",
    color: "text-orange-400",
  },
  {
    icon: CheckCircle2,
    title: "CRM AI",
    description: "Qualified new enterprise lead.",
    time: "1 min ago",
    color: "text-pink-400",
  },
];

export default function LiveAIFeed() {
  return (
    <Card className="p-7">

      <div className="mb-7 flex items-center justify-between">

        <div>

          <h2 className="text-2xl font-semibold">
            Live AI Feed
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Real-time activity across all AI systems.
          </p>

        </div>

        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1">

          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />

          <span className="text-xs text-emerald-400">
            LIVE
          </span>

        </div>

      </div>

      <div className="space-y-5">

        {events.map((event, index) => {

          const Icon = event.icon;

          return (

            <div
              key={index}
              className="flex gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-violet-500/20 hover:bg-white/[0.04]"
            >

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 ${event.color}`}
              >
                <Icon size={20} />
              </div>

              <div className="flex-1">

                <div className="flex items-center justify-between">

                  <h3 className="font-medium">
                    {event.title}
                  </h3>

                  <div className="flex items-center gap-1 text-xs text-neutral-500">

                    <Clock3 size={12} />

                    {event.time}

                  </div>

                </div>

                <p className="mt-1 text-sm text-neutral-400">
                  {event.description}
                </p>

              </div>

            </div>

          );

        })}

      </div>

    </Card>
  );
}