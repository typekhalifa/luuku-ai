import {
  ArrowRight,
  Bot,
  Cpu,
  MemoryStick,
  Timer,
} from "lucide-react";

import { motion } from "framer-motion";

import { Card } from "@/shared/components/ui";

interface AgentCardProps {
  name: string;
  description: string;
  status: string;
}

export default function AgentCard({
  name,
  description,
  status,
}: AgentCardProps) {
  return (
    <motion.div
      whileHover={{
        y: -6,
        scale: 1.02,
      }}
      transition={{
        duration: 0.25,
      }}
    >
      <Card
        className="
          relative
          overflow-hidden
          rounded-3xl
          border
          border-white/10
          bg-gradient-to-br
          from-[#151515]
          via-[#101010]
          to-[#090909]
          p-7
        "
      >
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-violet-600/10 blur-3xl" />

        <div className="relative z-10">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/10">
                <Bot className="h-6 w-6 text-violet-400" />
              </div>

              <div>

                <h3 className="text-lg font-semibold">
                  {name}
                </h3>

                <p className="text-sm text-neutral-500">
                  {description}
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

              <span className="text-sm text-emerald-400">
                {status}
              </span>

            </div>

          </div>

          <div className="my-6 border-t border-white/5" />

          <div className="space-y-3">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <Cpu size={16} />

                CPU

              </div>

              <span>18%</span>

            </div>

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <MemoryStick size={16} />

                Memory

              </div>

              <span>34%</span>

            </div>

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <Timer size={16} />

                Latency

              </div>

              <span>220 ms</span>

            </div>

          </div>

          <div className="my-6 border-t border-white/5" />

          <div>

            <p className="text-xs uppercase tracking-wider text-neutral-500">
              Current Task
            </p>

            <p className="mt-2 text-sm text-neutral-300">
              Coordinating enterprise AI workflows.
            </p>

          </div>

          <button
            className="
              mt-6
              flex
              items-center
              gap-2
              text-sm
              text-violet-400
              transition-colors
              hover:text-violet-300
            "
          >
            Open Agent

            <ArrowRight size={16} />

          </button>

        </div>

      </Card>
    </motion.div>
  );
}