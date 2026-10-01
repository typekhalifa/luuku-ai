import { ArrowDownToLine, ArrowUpFromLine, MessageSquare } from "lucide-react";
import { Card } from "@/shared/components/ui";
import type { DashboardCommunicationObservability } from "@/sdk/types/dashboard";

export default function CommunicationObservability({
  data,
}: {
  data: DashboardCommunicationObservability;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <MessageSquare size={18} />
        <h2 className="text-2xl font-semibold">Communication Observability</h2>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">Messages</div>
          <div className="mt-2 text-2xl font-semibold">{data.messages.total}</div>
          <div className="mt-1 flex gap-3 text-xs text-white/40">
            <span><ArrowDownToLine size={12} className="inline" /> {data.messages.inbound} inbound</span>
            <span><ArrowUpFromLine size={12} className="inline" /> {data.messages.outbound} outbound</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">Conversations</div>
          <div className="mt-2 text-2xl font-semibold">{data.conversations.total}</div>
          <div className="mt-1 text-xs text-white/40">{data.conversations.active} active</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">Executions</div>
          <div className="mt-2 text-2xl font-semibold">{data.executions.total}</div>
          <div className="mt-1 text-xs text-white/40">{data.executions.verified} verified · {data.executions.failed} failed</div>
        </div>
      </div>
    </Card>
  );
}
