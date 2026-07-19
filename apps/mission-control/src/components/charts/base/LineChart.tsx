import {
  LineChart as ReLineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartDefaults } from "@/config/charts/defaults";
import { chartTheme } from "@/config/charts/theme";
import { chartColors } from "@/config/charts/colors";

interface LineChartProps<T> {
  data: T[];
  dataKey: keyof T;
  xKey: keyof T;
}

export default function LineChart<T>({
  data,
  dataKey,
  xKey,
}: LineChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ReLineChart
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

        <Line
          type="monotone"
          dataKey={String(dataKey)}
          stroke={chartColors.primary}
          strokeWidth={chartDefaults.strokeWidth}
          animationDuration={
            chartDefaults.animationDuration
          }
        />
      </ReLineChart>
    </ResponsiveContainer>
  );
}