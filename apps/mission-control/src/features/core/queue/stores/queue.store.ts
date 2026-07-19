import type { QueueTask } from "../types/queue";

export const queue: QueueTask[] = [
  {
    id: "1",
    title: "Research companies",
    agent: "Research AI",
    status: "running",
    progress: 42,
  },
  {
    id: "2",
    title: "Score prospects",
    agent: "Sales AI",
    status: "queued",
    progress: 0,
  },
  {
    id: "3",
    title: "Generate report",
    agent: "Executive AI",
    status: "queued",
    progress: 0,
  },
];