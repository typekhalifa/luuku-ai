import { Card } from "@/shared/components/ui";

interface WorkflowTimelineProps {
  events: {
    id?: string;
    type: string;
    occurredAt: string;
  }[];
}

export default function WorkflowTimeline({
  events,
}: WorkflowTimelineProps) {
  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-semibold">
        Workflow Timeline
      </h2>

      <div className="space-y-4">
        {events.length === 0 && (
          <p className="text-neutral-500">
            No workflow events.
          </p>
        )}

        {events.map((event, index) => (
          <div
            key={event.id ?? index}
            className="rounded-xl bg-neutral-950 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {event.type}
              </h3>

              <span className="text-xs text-neutral-500">
                {new Date(event.occurredAt).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}