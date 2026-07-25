import {
  Bot,
} from "lucide-react";

import { Card } from "@/shared/components/ui";

import { useRegistry } from "@/features/core/registry";

export default function RuntimeAgents() {

  const agents = useRegistry();

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

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

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
                      {agent.role}
                  </p>
                  
                  <div className="mt-3 flex flex-wrap gap-2">

                      {agent.capabilities.map((capability) => (

                          <span
                              key={capability}
                              className="rounded-full bg-violet-500/10 px-2 py-1 text-xs text-violet-300"
                          >

                              {capability}

                          </span>

                      ))}

                  </div>

                </div>

              </div>

              <StatusBadge
                status={agent.status}
              />

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

  status:
  "idle" | "running" | "offline"

}) {

  const styles = {

    idle:

      "bg-neutral-500/10 text-neutral-400",

    running:

      "bg-emerald-500/10 text-emerald-400",

    offline:

      "bg-amber-500/10 text-amber-400",

  };

  return (

    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >

      {status}

    </span>

  );

}