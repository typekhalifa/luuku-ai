import fs from "fs";
import path from "path";
import { ProspectMemory } from "../../shared/types/memory";

export interface DashboardMetrics {
  total: number;
  researched: number;
  contacted: number;
  meetings: number;
  proposals: number;
  won: number;
  lost: number;
  averageFit: number;
}

export function calculateMetrics(): DashboardMetrics {

  const prospectDir = path.join(
    process.cwd(),
    "luuku-ai",
    "memory",
    "prospects"
  );

  if (!fs.existsSync(prospectDir)) {
    return {
      total: 0,
      researched: 0,
      contacted: 0,
      meetings: 0,
      proposals: 0,
      won: 0,
      lost: 0,
      averageFit: 0,
    };
  }

  const files = fs
    .readdirSync(prospectDir)
    .filter(file => file.endsWith(".json"));

  const prospects: ProspectMemory[] = files.map(file => {

    const fullPath = path.join(prospectDir, file);

    return JSON.parse(
      fs.readFileSync(fullPath, "utf8")
    );

  });

  const total = prospects.length;

  const researched = prospects.filter(
    p => p.status === "researched"
  ).length;

  const contacted = prospects.filter(
    p => p.status === "contacted"
  ).length;

  const meetings = prospects.filter(
    p => p.status === "meeting-booked"
  ).length;

  const proposals = prospects.filter(
    p => p.status === "proposal-sent"
  ).length;

  const won = prospects.filter(
    p => p.status === "won"
  ).length;

  const lost = prospects.filter(
    p => p.status === "lost"
  ).length;

  const averageFit =
    total === 0
      ? 0
      : prospects.reduce(
          (sum, p) => sum + p.fitScore,
          0
        ) / total;

  return {

    total,

    researched,

    contacted,

    meetings,

    proposals,

    won,

    lost,

    averageFit:
      Number(averageFit.toFixed(1))

  };

}