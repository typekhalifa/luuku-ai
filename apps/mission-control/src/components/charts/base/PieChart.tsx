import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { chartColors } from "@/config/charts/colors";

const COLORS = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.cyan,
  chartColors.emerald,
  chartColors.amber,
];

interface PieChartProps<T> {
  data: T[];
  dataKey: keyof T;
  nameKey: keyof T;
}

export default function PieChart<T>({
  data,
  dataKey,
  nameKey,
}: PieChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RePieChart>
        <Pie
          data={data}
          dataKey={String(dataKey)}
          nameKey={String(nameKey)}
        >
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>

        <Tooltip />
      </RePieChart>
    </ResponsiveContainer>
  );
}