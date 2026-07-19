import ChartCard from "@/shared/components/charts/ChartCard";
import BarChart from "@/components/charts/base/BarChart";

import { useWorkflowStats } from "@/hooks/useAnalytics";

export default function WorkflowChart() {
  const { data = [], isLoading } = useWorkflowStats();

  if (isLoading) {
    return (
      <ChartCard
        title="Workflow Activity"
        subtitle="Executed Workflows"
      >
        <div className="h-[320px] animate-pulse rounded-xl bg-neutral-800" />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Workflow Activity"
      subtitle="Executed Workflows"
    >
      <BarChart
        data={data}
        xKey="day"
        dataKey="workflows"
      />
    </ChartCard>
  );
}