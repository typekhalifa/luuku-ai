import { ApiClient } from "./ApiClient";
import { env } from "@/config/env";

export const api = new ApiClient({
  baseUrl: env.apiBaseUrl,
});