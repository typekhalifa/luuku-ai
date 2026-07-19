import ChartCard from "@/shared/components/charts/ChartCard";
import LineChart from "@/components/charts/base/LineChart";

import { useLatency } from "@/hooks/useAnalytics";

export default function LatencyChart() {
  const { data = [], isLoading } = useLatency();

  if (isLoading) {
    return (
      <ChartCard
        title="Latency"
        subtitle="Response Time (ms)"
      >
        <div className="h-[320px] animate-pulse rounded-xl bg-neutral-800" />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Latency"
      subtitle="Response Time (ms)"
    >
      <LineChart
        data={data}
        xKey="time"
        dataKey="latency"
      />
    </ChartCard>
  );
}