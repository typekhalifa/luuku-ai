import { Activity, AlertTriangle, Clock3, Server, Workflow } from "lucide-react";
import { Card } from "@/shared/components/ui";
import { useObservability } from "../hooks/useObservability";

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Activity }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/40">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-white/40">{detail}</div>
    </div>
  );
}

export default function OperationalObservability() {
  const { data, loading, error } = useObservability();

  if (loading) {
    return <Card className="p-6 text-white/50">Loading operational observability…</Card>;
  }

  if (error || !data) {
    return <Card className="p-6 text-red-300">Operational observability unavailable.</Card>;
  }

  const alerts = data.alerts ?? [];

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-white/40">V8.11</p>
          <h2 className="mt-1 text-2xl font-semibold">Operational Observability</h2>
          <p className="mt-1 text-sm text-white/40">Durable company-scoped evidence from the execution layer.</p>
        </div>
        <div className="text-xs text-white/30">Last 24 hours</div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Requests" value={String(data.requests)} detail={`${data.request5xx} server errors · ${data.request4xx} client errors`} icon={Activity} />
        <Metric label="Error rate" value={`${(data.requestErrorRate * 100).toFixed(2)}%`} detail="4xx + 5xx requests" icon={AlertTriangle} />
        <Metric label="Latency" value={`${Math.round(data.latency.averageMs)} ms`} detail={`${data.latency.samples} samples · max ${Math.round(data.latency.maxMs)} ms`} icon={Clock3} />
        <Metric label="Executions" value={String(data.executions.succeeded)} detail={`${data.executions.failed} failed · ${data.executions.started} started`} icon={Workflow} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/40"><Server size={14} /> Providers</div>
          <div className="mt-3 flex gap-6">
            <span><strong>{data.providers.succeeded}</strong> succeeded</span>
            <span><strong>{data.providers.failed}</strong> failed</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/40"><AlertTriangle size={14} /> Alerts</div>
          <div className="mt-3">
            {alerts.length === 0 ? (
              <span className="text-sm text-emerald-300">No active threshold alerts.</span>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-sm">
                    <span className="font-medium">{alert.message}</span>
                    <span className="ml-2 text-white/40">{alert.value} / {alert.threshold}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
