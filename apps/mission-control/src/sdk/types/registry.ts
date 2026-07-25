export interface AgentInfo {
  id: string;
  name: string;
  status: "online" | "offline";
  capabilities: string[];
}