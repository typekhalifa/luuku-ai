export interface ExecutionLog {
  id: string;
  task: string;
  agent: string;
  status: "started" | "completed" | "failed";
  timestamp: string;
}

const logs: ExecutionLog[] = [];

export function addLog(log: ExecutionLog): void {
  logs.unshift(log);
  if (logs.length > 100) logs.length = 100;
}

export function getLogs(): ExecutionLog[] {
  return [...logs];
}
