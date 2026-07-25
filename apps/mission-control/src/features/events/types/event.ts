export interface LuukuEvent<T = unknown> {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  payload: T;
}