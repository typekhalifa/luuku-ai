import ChartCard from "@/shared/components/charts/ChartCard";
import AreaChart from "@/components/charts/base/AreaChart";

import { useRevenue } from "@/hooks/useAnalytics";

export default function RevenueChart() {
  const { data = [], isLoading } = useRevenue();

  if (isLoading) {
    return (
      <ChartCard
        title="Revenue"
        subtitle="Monthly Revenue"
      >
        <div className="h-[320px] animate-pulse rounded-xl bg-neutral-800" />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Revenue"
      subtitle="Monthly Revenue"
    >
      <AreaChart
        data={data}
        xKey="month"
        dataKey="revenue"
      />
    </ChartCard>
  );
}