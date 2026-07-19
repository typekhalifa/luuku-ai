export type TaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export interface RuntimeTask {

  id: string;

  title: string;

  assignedTo: string;

  priority:
    | "low"
    | "medium"
    | "high";

  status: TaskStatus;

  createdAt: string;

}