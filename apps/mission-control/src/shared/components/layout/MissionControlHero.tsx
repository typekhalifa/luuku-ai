import {
  Bell,
  Command,
  Cpu,
} from "lucide-react";

export default function MissionControlHero() {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#191919] via-[#101010] to-[#090909] p-10">

      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-violet-600/10 blur-[120px]" />

      <div className="relative z-10 flex items-start justify-between">

        <div>

          <p className="text-sm uppercase tracking-[0.3em] text-violet-400">
            LUUKU AI
          </p>

          <h1 className="mt-4 text-5xl font-bold tracking-tight">
            Mission Control
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-400">
            Central intelligence for AI agents, workflows,
            CRM, automations and enterprise operations.
          </p>

          <div className="mt-8 flex gap-3">

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-neutral-500">
                AI Agents
              </p>

              <p className="mt-1 text-xl font-bold">
                12 Online
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-neutral-500">
                Runtime
              </p>

              <p className="mt-1 text-xl font-bold text-emerald-400">
                Operational
              </p>
            </div>

          </div>

        </div>

        <div className="flex gap-3">

          <button className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10">
            <Bell size={20} />
          </button>

          <button className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10">
            <Cpu size={20} />
          </button>

          <button className="rounded-2xl border border-white/10 bg-violet-600 px-5 font-medium hover:bg-violet-500">
            <div className="flex items-center gap-2">
              <Command size={18} />
              Ctrl + K
            </div>
          </button>

        </div>

      </div>

    </section>
  );
}