import { chartColors } from "./colors";

export const chartTheme = {

  axis: {

    stroke: chartColors.axis,

    fontSize: 12,

  },

  grid: {

    stroke: chartColors.grid,

    strokeDasharray: "3 3",

  },

  tooltip: {

    background: chartColors.tooltip,

    border: chartColors.grid,

    color: chartColors.text,

  },

};