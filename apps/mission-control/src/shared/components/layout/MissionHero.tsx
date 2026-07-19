import {
  Activity,
  Bot,
  Command,
  Cpu,
} from "lucide-react";

export default function MissionHero() {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#191919] via-[#101114] to-[#090909] p-10">

      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-600/10 blur-[140px]" />

      <div className="relative z-10">

        <p className="uppercase tracking-[0.35em] text-violet-400 text-sm">
          LUUKU AI
        </p>

        <h1 className="mt-5 text-6xl font-bold tracking-tight">
          Mission Control
        </h1>

        <p className="mt-5 max-w-3xl text-lg text-neutral-400 leading-8">
          Enterprise AI Operations Center for autonomous agents,
          CRM, workflows and intelligent business automation.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">

          <StatusCard
            icon={<Bot size={20} />}
            title="Agents"
            value="12 Online"
          />

          <StatusCard
            icon={<Cpu size={20} />}
            title="Runtime"
            value="Operational"
          />

          <StatusCard
            icon={<Activity size={20} />}
            title="Health"
            value="98.9%"
          />

          <button className="flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-4 font-semibold transition hover:bg-violet-500">
            <Command size={18} />
            Ctrl + K
          </button>

        </div>

      </div>

    </section>
  );
}

interface StatusCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

function StatusCard({
  icon,
  title,
  value,
}: StatusCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">

      <div className="flex items-center gap-3">

        {icon}

        <div>

          <p className="text-xs text-neutral-500">
            {title}
          </p>

          <p className="font-semibold">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}