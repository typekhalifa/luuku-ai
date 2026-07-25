export interface RuntimeStatus {
  status: "running" | "stopped";
  activeAgents: number;
  queuedTasks: number;
  uptime: number;
}