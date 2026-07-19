import {
  AreaChart as ReAreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartDefaults } from "@/config/charts/defaults";
import { chartTheme } from "@/config/charts/theme";
import { chartColors } from "@/config/charts/colors";

interface AreaChartProps<T> {
  data: T[];
  dataKey: keyof T;
  xKey: keyof T;
}

export default function AreaChart<T>({
  data,
  dataKey,
  xKey,
}: AreaChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ReAreaChart
        data={data}
        margin={chartDefaults.margin}
      >
        <CartesianGrid {...chartTheme.grid} />

        <XAxis
          dataKey={String(xKey)}
          {...chartTheme.axis}
        />

        <YAxis {...chartTheme.axis} />

        <Tooltip />

        <Area
          type="monotone"
          dataKey={String(dataKey)}
          stroke={chartColors.primary}
          fill={chartColors.primary}
          fillOpacity={0.25}
          animationDuration={
            chartDefaults.animationDuration
          }
        />
      </ReAreaChart>
    </ResponsiveContainer>
  );
}