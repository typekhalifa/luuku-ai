import type { DashboardCommunicationObservability } from "../types/dashboard";

type Props = {
  data: DashboardCommunicationObservability;
};

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function sourceLabel(source: "message" | "execution" | "event") {
  if (source === "message") return "MESSAGE";
  if (source === "execution") return "EXECUTION";
  return "EVENT";
}

export default function CommunicationObservability({ data }: Props) {
  const channelEntries = Object.entries(data.channels);
  const statusEntries = Object.entries(data.executions.byStatus);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Communication Observability</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Live visibility across messages, executions, events, policy, and channels.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Messages" value={data.messages.total} detail={`${data.messages.inbound} in · ${data.messages.outbound} out`} />
        <Metric title="Conversations" value={data.conversations.total} detail={`${data.conversations.active} active`} />
        <Metric title="Executions" value={data.executions.total} detail={`${data.executions.verified} verified · ${data.executions.failed} failed`} />
        <Metric title="Events" value={data.events.total} detail={`${Object.keys(data.events.byType).length} event types`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Execution State</h3>
            <span className="text-xs text-neutral-500">Policy + provider aware</span>
          </div>
          <div className="space-y-3">
            {statusEntries.length === 0 ? (
              <p className="text-sm text-neutral-500">No executions recorded yet.</p>
            ) : (
              statusEntries.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-neutral-300">{status}</span>
                  <span className="font-medium text-white">{count}</span>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 border-t border-neutral-800 pt-5">
            <h4 className="mb-3 text-sm font-medium text-neutral-300">Channels</h4>
            <div className="flex flex-wrap gap-2">
              {channelEntries.length === 0 ? (
                <span className="text-sm text-neutral-500">No channels yet.</span>
              ) : (
                channelEntries.map(([channel, count]) => (
                  <span key={channel} className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                    {channel}: {count}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Unified Activity</h3>
            <span className="text-xs text-neutral-500">Latest {data.timeline.length}</span>
          </div>
          <div className="divide-y divide-neutral-800">
            {data.timeline.length === 0 ? (
              <p className="py-4 text-sm text-neutral-500">No communication activity yet.</p>
            ) : (
              data.timeline.map((entry) => (
                <div key={`${entry.source}:${entry.id}`} className="flex items-center gap-4 py-3">
                  <span className="w-20 text-[10px] font-semibold tracking-wider text-neutral-500">
                    {sourceLabel(entry.source)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-200">
                      {entry.type ?? entry.status ?? entry.direction ?? entry.provider ?? "Communication activity"}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {entry.channel ?? entry.provider ?? entry.conversationId ?? "system"}
                      {entry.verified ? " · verified" : ""}
                    </p>
                  </div>
                  <time className="text-xs text-neutral-500">{formatTime(entry.timestamp)}</time>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ title, value, detail }: { title: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
      <p className="text-sm text-neutral-400">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}
