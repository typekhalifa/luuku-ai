import ChartCard from "@/shared/components/charts/ChartCard";
import BarChart from "@/components/charts/base/BarChart";

import { useTokenUsage } from "@/hooks/useAnalytics";

export default function TokenUsageChart() {
  const { data = [], isLoading } = useTokenUsage();

  if (isLoading) {
    return (
      <ChartCard
        title="Token Usage"
        subtitle="LLM Tokens"
      >
        <div className="h-[320px] animate-pulse rounded-xl bg-neutral-800" />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Token Usage"
      subtitle="LLM Tokens"
    >
      <BarChart
        data={data}
        xKey="day"
        dataKey="tokens"
      />
    </ChartCard>
  );
}