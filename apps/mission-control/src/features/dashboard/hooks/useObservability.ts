import { useEffect, useState } from "react";
import { getObservabilityDashboard } from "../api/observability.api";
import type { ObservabilityDashboard } from "../types/observability";

export function useObservability() {
  const [data, setData] = useState<ObservabilityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    getObservabilityDashboard()
      .then((next) => {
        if (active) setData(next);
      })
      .catch((err) => {
        if (active) setError(err as Error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}
