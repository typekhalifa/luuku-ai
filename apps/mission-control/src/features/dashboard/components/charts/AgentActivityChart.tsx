import ChartCard from "@/shared/components/charts/ChartCard";
import LineChart from "@/components/charts/base/LineChart";

import { useAgentActivity } from "@/hooks/useAnalytics";

export default function AgentActivityChart() {
  const { data = [], isLoading } = useAgentActivity();

  if (isLoading) {
    return (
      <ChartCard
        title="Agent Activity"
        subtitle="Running AI Agents"
      >
        <div className="h-[320px] animate-pulse rounded-xl bg-neutral-800" />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Agent Activity"
      subtitle="Running AI Agents"
    >
      <LineChart
        data={data}
        xKey="time"
        dataKey="active"
      />
    </ChartCard>
  );
}