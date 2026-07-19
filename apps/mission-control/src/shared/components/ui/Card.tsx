import type { ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({
  children,
  className,
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-xl",
        className
      )}
    >
      {children}
    </div>
  );
}