import { Activity } from "lucide-react";
import { Card } from "@/shared/components/ui";
import { getLogs, type ExecutionLog } from "./services/log.service";

export default function ExecutionFeed() {
  const logs: ExecutionLog[] = getLogs();

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Activity size={18} />
        <h2 className="text-2xl font-semibold">Execution Feed</h2>
      </div>
      <div className="mt-5 space-y-3">
        {logs.length === 0 ? (
          <p className="text-sm text-white/40">No local execution events yet.</p>
        ) : (
          logs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium">{log.task}</p>
                <p className="text-xs text-white/40">{log.agent} · {log.timestamp}</p>
              </div>
              <span className="text-xs uppercase tracking-wider text-white/50">{log.status}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
