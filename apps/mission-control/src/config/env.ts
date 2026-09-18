const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL;

export const env = {
  apiBaseUrl: apiBaseUrl ?? "http://localhost:3000/api/v1",
  wsBaseUrl: wsBaseUrl ?? "ws://localhost:3000/events",
  apiKey: import.meta.env.VITE_LUUKU_API_KEY ?? "",
};

if (import.meta.env.PROD && !apiBaseUrl) {
  console.warn("VITE_API_BASE_URL is not configured; Mission Control is using the local development API fallback.");
}
