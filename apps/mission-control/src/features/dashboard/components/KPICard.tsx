import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/shared/components/ui";

interface KPICardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: LucideIcon;
  trend?: string;
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: KPICardProps) {
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
        to-[#0a0a0a]
        p-7
      "
      >
        <div
          className="
          absolute
          right-0
          top-0
          h-32
          w-32
          rounded-full
          bg-violet-600/10
          blur-3xl
        "
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">
              {title}
            </span>

            <Icon
              size={20}
              className="text-violet-400"
            />
          </div>

          <h2 className="mt-8 text-5xl font-bold tracking-tight">
            {value}
          </h2>

          {trend && (
            <p className="mt-3 text-sm font-medium text-emerald-400">
              {trend}
            </p>
          )}

          <div className="mt-8 border-t border-white/5 pt-4">
            <p className="text-sm text-neutral-500">
              {subtitle}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}