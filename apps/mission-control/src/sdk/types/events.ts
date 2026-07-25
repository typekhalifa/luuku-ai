export type EventType =
  | "planner.started"
  | "planner.completed"
  | "runtime.updated"
  | "agent.started"
  | "agent.finished"
  | "queue.updated";

export interface LuukuEvent<T = unknown> {
  type: EventType;
  timestamp: string;
  payload: T;
}