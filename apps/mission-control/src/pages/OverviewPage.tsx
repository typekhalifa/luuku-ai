import {
  Activity,
  Bot,
  Building2,
  Workflow,
} from "lucide-react";

import {
  DashboardLayout,
  MissionHero,
  TopNavigation,
} from "@/shared/components/layout";

import { useAgents } from "@/features/agents";
import { useWorkflow } from "@/features/workflow";

import {
  useDashboard,
  KPICard,
  AgentCard,
  WorkflowTimeline,
  RecentEvents,
  SystemHealth,
  RevenueChart,
  WorkflowChart,
  MemoryChart,
  LatencyChart,
  TokenUsageChart,
  AgentActivityChart,
  LiveAIFeed,
  ExecutiveInsights,
} from "@/features/dashboard";

import {
  RuntimeAgents,
} from "@/features/core/runtime";

import { PlannerPreview } from "@/features/core/planner";
import { ExecutionFeed } from "@/features/core/logs";

import { TaskQueue } from "@/features/core/queue";

export default function OverviewPage() {
  const {
    stats,
    loading,
    error,
  } = useDashboard();

  const agents = useAgents();

  const workflow = useWorkflow();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-neutral-400">
        Loading Mission Control...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-400">
        {error}
      </div>
    );
  }

  return (
    <DashboardLayout>

      <TopNavigation />

      <MissionHero />

      <div className="mt-10 space-y-10">

        {/* KPI CARDS */}

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

          <KPICard
            title="Companies"
            value={stats?.companies ?? 0}
            subtitle="Registered Companies"
            icon={Building2}
            trend="+12% this month"
          />

          <KPICard
            title="Agents"
            value={stats?.agents ?? 0}
            subtitle="Running AI Agents"
            icon={Bot}
            trend="+3 online"
          />

          <KPICard
            title="Workflows"
            value={stats?.workflows ?? 0}
            subtitle="Executed Today"
            icon={Workflow}
            trend="+28 today"
          />

          <KPICard
            title="Events"
            value={stats?.events ?? 0}
            subtitle="System Events"
            icon={Activity}
            trend="Live"
          />

        </section>

        {/* CHARTS */}

        <section className="grid gap-6 xl:grid-cols-2">

          <RevenueChart />

          <AgentActivityChart />

          <WorkflowChart />

          <MemoryChart />

          <LatencyChart />

          <TokenUsageChart />

        </section>

        {/* AGENTS + WORKFLOW */}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">

          <div>

            <h2 className="mb-5 text-2xl font-semibold">
              AI Agents
            </h2>

            <div className="grid gap-6 lg:grid-cols-2">

              {agents.map((agent) => (

                <AgentCard
                  key={agent.id}
                  name={agent.name}
                  status={agent.status}
                  description={agent.task}
                />

              ))}

            </div>

          </div>

          <WorkflowTimeline
            events={workflow}
          />

        </section>


        {/* AI PLANNER + EXECUTION */}

        <section className="grid gap-6 xl:grid-cols-2">

          <PlannerPreview />

          <ExecutionFeed />

        </section>

        {/* TASK QUEUE */}

        <section>

          <TaskQueue />

        </section>

        {/* SYSTEM PANELS */}

        <section className="grid gap-6 xl:grid-cols-2">

          <LiveAIFeed />

          <ExecutiveInsights />

        </section>

        <section className="grid gap-6 xl:grid-cols-3">

          <RuntimeAgents />

          <SystemHealth />

          <RecentEvents
            events={workflow}
          />

        </section>
      </div>

    </DashboardLayout>
  );
}