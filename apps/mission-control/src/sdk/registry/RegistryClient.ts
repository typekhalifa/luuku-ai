import { api } from "../client/api";
import type { AgentInfo } from "../types";

export class RegistryClient {
  listAgents() {
    return api.get<AgentInfo[]>("/agents");
  }
}

export const registryClient = new RegistryClient();