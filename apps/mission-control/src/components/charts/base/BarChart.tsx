import {
  BarChart as ReBarChart,
  Bar,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartDefaults } from "@/config/charts/defaults";
import { chartTheme } from "@/config/charts/theme";
import { chartColors } from "@/config/charts/colors";

interface BarChartProps<T> {
  data: T[];
  dataKey: keyof T;
  xKey: keyof T;
}

export default function BarChart<T>({
  data,
  dataKey,
  xKey,
}: BarChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ReBarChart
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

        <Bar
          dataKey={String(dataKey)}
          fill={chartColors.primary}
          radius={chartDefaults.radius}
        />
      </ReBarChart>
    </ResponsiveContainer>
  );
}