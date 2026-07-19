import type { ReactNode } from "react";

import { motion } from "framer-motion";

import {
  CalendarDays,
  Download,
} from "lucide-react";

import { Card } from "@/shared/components/ui";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}

export default function ChartCard({
  title,
  subtitle,
  children,
  action,
}: ChartCardProps) {
  return (
    <motion.div
      whileHover={{
        y: -5,
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
        <div
          className="
            absolute
            right-0
            top-0
            h-40
            w-40
            rounded-full
            bg-violet-600/10
            blur-3xl
          "
        />

        <div className="relative z-10">

          <div className="flex items-start justify-between">

            <div>

              <h2 className="text-xl font-semibold">
                {title}
              </h2>

              {subtitle && (

                <p className="mt-1 text-sm text-neutral-500">
                  {subtitle}
                </p>

              )}

            </div>

            {action ?? (

              <div className="flex gap-2">

                <button
                  className="
                    flex
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-white/10
                    px-3
                    py-2
                    text-sm
                    text-neutral-400
                    transition
                    hover:border-violet-500/30
                    hover:text-white
                  "
                >
                  <CalendarDays size={15} />

                  30 Days

                </button>

                <button
                  className="
                    rounded-xl
                    border
                    border-white/10
                    p-2
                    text-neutral-400
                    transition
                    hover:border-violet-500/30
                    hover:text-white
                  "
                >
                  <Download size={16} />
                </button>

              </div>

            )}

          </div>

          <div className="mt-8 h-[320px]">

            {children}

          </div>

        </div>

      </Card>
    </motion.div>
  );
}