import { Card } from "@/shared/components/ui";

interface RecentEventsProps {
  events: {
    id?: string;
    type: string;
    occurredAt: string;
  }[];
}

export default function RecentEvents({
  events,
}: RecentEventsProps) {
  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-semibold">
        Recent Events
      </h2>

      <div className="space-y-3">
        {events.slice(0, 5).map((event, index) => (
          <div
            key={event.id ?? index}
            className="rounded-lg bg-neutral-950 p-3"
          >
            <p className="font-medium">
              {event.type}
            </p>

            <p className="text-xs text-neutral-500">
              {new Date(event.occurredAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}