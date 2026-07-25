export interface LuukuAgent {

  id: string;

  name: string;

  role: string;

  status:
    | "idle"
    | "running"
    | "offline";

  capabilities: string[];

}