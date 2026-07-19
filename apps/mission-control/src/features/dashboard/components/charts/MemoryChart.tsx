import ChartCard from "@/shared/components/charts/ChartCard";
import AreaChart from "@/components/charts/base/AreaChart";

import { useMemoryUsage } from "@/hooks/useAnalytics";

export default function MemoryChart() {
  const { data = [], isLoading } = useMemoryUsage();

  if (isLoading) {
    return (
      <ChartCard
        title="Memory Usage"
        subtitle="RAM Consumption"
      >
        <div className="h-[320px] animate-pulse rounded-xl bg-neutral-800" />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Memory Usage"
      subtitle="RAM Consumption"
    >
      <AreaChart
        data={data}
        xKey="time"
        dataKey="memory"
      />
    </ChartCard>
  );
}