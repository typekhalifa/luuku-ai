import {
  Bot,
  Clock3,
} from "lucide-react";

import { Card } from "@/shared/components/ui";
import { useRuntime } from "../hooks/useRuntime";

export default function RuntimeAgents() {
  const agents = useRuntime();

  return (
    <Card className="p-6">

      <div className="mb-6 flex items-center justify-between">

        <div>

          <h2 className="text-2xl font-semibold">
            Runtime Agents
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Live AI workforce status
          </p>

        </div>

        <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
          LIVE
        </div>

      </div>

      <div className="space-y-4">

        {agents.map((agent) => (

          <div
            key={agent.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-violet-500/30"
          >

            <div className="flex items-start justify-between">

              <div className="flex gap-3">

                <div className="rounded-xl bg-violet-500/10 p-3">

                  <Bot
                    size={18}
                    className="text-violet-400"
                  />

                </div>

                <div>

                  <h3 className="font-semibold">
                    {agent.name}
                  </h3>

                  <p className="mt-1 text-sm text-neutral-500">
                    {agent.skills.join(" • ")}
                  </p>

                </div>

              </div>

              <StatusBadge status={agent.status} />

            </div>

            {agent.currentTask && (

              <div className="mt-4 rounded-xl bg-black/20 p-3">

                <p className="text-xs uppercase tracking-wider text-neutral-500">
                  Current Task
                </p>

                <p className="mt-1 text-sm">
                  {agent.currentTask}
                </p>

              </div>

            )}

            <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">

              <Clock3 size={12} />

              Heartbeat {agent.heartbeat}

            </div>

          </div>

        ))}

      </div>

    </Card>
  );
}

function StatusBadge({
  status,
}: {
  status: "online" | "offline" | "busy";
}) {
  const styles = {
    online: "bg-emerald-500/10 text-emerald-400",
    busy: "bg-amber-500/10 text-amber-400",
    offline: "bg-red-500/10 text-red-400",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}