import {
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

import { Card } from "@/shared/components/ui";

export default function ExecutiveInsights() {
  return (
    <Card className="relative overflow-hidden p-7">

      <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-violet-600/10 blur-[120px]" />

      <div className="relative z-10">

        <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/10">

            <BrainCircuit
              className="text-violet-400"
              size={22}
            />

          </div>

          <div>

            <h2 className="text-2xl font-semibold">
              Executive Insights
            </h2>

            <p className="text-sm text-neutral-500">
              AI generated operational summary
            </p>

          </div>

        </div>

        <div className="mt-8 space-y-5">

          <Insight
            icon={<TrendingUp size={18} />}
            title="Revenue Growth"
            description="Revenue increased by 18% compared to last month."
            color="text-emerald-400"
          />

          <Insight
            icon={<Sparkles size={18} />}
            title="Research AI"
            description="Five new competitors were discovered today."
            color="text-cyan-400"
          />

          <Insight
            icon={<AlertTriangle size={18} />}
            title="Recommendation"
            description="Workflow Engine detected two delayed automations requiring review."
            color="text-amber-400"
          />

        </div>

        <div className="mt-8 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">

          <p className="text-sm text-neutral-400">

            <span className="font-semibold text-white">
              Executive AI
            </span>

            {" "}
            recommends scheduling a sales follow-up with high-value
            enterprise leads while the system health remains above
            98%.

          </p>

        </div>

      </div>

    </Card>
  );
}

function Insight({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex gap-4">

      <div
        className={`mt-1 ${color}`}
      >
        {icon}
      </div>

      <div>

        <h3 className="font-medium">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-neutral-400">
          {description}
        </p>

      </div>

    </div>
  );
}