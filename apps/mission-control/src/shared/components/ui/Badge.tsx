import type { ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export default function Badge({
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full",
        "px-3 py-1",
        "text-xs font-medium",
        "bg-violet-500/10 text-violet-300",
        className
      )}
    >
      {children}
    </span>
  );
}