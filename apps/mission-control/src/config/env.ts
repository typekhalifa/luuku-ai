const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL;

if (import.meta.env.PROD && !apiBaseUrl) {
  throw new Error(
    "VITE_API_BASE_URL must be configured for production Mission Control builds.",
  );
}

export const env = {
  apiBaseUrl: apiBaseUrl ?? "http://localhost:3000/api/v1",
  wsBaseUrl: wsBaseUrl ?? "ws://localhost:3000/events",
};
