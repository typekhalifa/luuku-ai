import { useCallback, useEffect, useState } from "react";
import { getObservabilityDashboard } from "../api/observability.api";
import type { ObservabilityDashboard } from "../types/observability";

const REFRESH_INTERVAL_MS = 15_000;

export function useObservability() {
  const [data, setData] = useState<ObservabilityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async (initial = false) => {
    if (initial) setLoading(true);

    try {
      const next = await getObservabilityDashboard();
      setData(next);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);

    const interval = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [refresh]);

  return { data, loading, error, refresh };
}
