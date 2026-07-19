import { useEffect, useState } from "react";

import { getEvents } from "../api/workflow.api";
import type { WorkflowEvent } from "../types/workflow";

export function useWorkflow() {
  const [events, setEvents] = useState<WorkflowEvent[]>([]);

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(console.error);
  }, []);

  return events;
}