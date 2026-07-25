import { useEffect } from "react";
import { wsClient } from "@/sdk/events";
import type { LuukuEvent } from "@/sdk/types";

export function useEvents(
  callback: (event: LuukuEvent) => void,
) {
  useEffect(() => {
    wsClient.connect();

    const unsubscribe =
      wsClient.subscribe(callback);

    return () => {
      unsubscribe();
    };
  }, [callback]);
}