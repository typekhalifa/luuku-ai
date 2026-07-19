export type QueueStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export interface QueueTask {
  id: string;
  title: string;
  agent: string;
  status: QueueStatus;
  progress: number;
}