import { cn } from "@/shared/utils/cn";

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-white/10",
        className
      )}
    />
  );
}