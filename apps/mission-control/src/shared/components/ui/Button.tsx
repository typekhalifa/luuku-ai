import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/shared/utils/cn";

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {}

export default function Button({
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200",
        "bg-violet-600 hover:bg-violet-500",
        "text-white",
        "disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}