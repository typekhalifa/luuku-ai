import { env } from "@/config/env";

const API_BASE = env.apiBaseUrl;

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return (await response.json()) as T;
}
