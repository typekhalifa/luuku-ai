import {
  Bell,
  Search,
  Settings,
} from "lucide-react";

export default function TopNavigation() {
  return (
    <header className="mb-8 flex items-center justify-between">

      <div className="relative w-[420px]">

        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
        />

        <input
          placeholder="Search agents, CRM, workflows..."
          className="w-full rounded-2xl border border-white/10 bg-[#111] py-4 pl-12 pr-4 outline-none transition focus:border-violet-500"
        />

      </div>

      <div className="flex items-center gap-3">

        <IconButton>
          <Bell size={18} />
        </IconButton>

        <IconButton>
          <Settings size={18} />
        </IconButton>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 font-bold">
          L
        </div>

      </div>

    </header>
  );
}

function IconButton({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <button className="rounded-2xl border border-white/10 bg-[#111] p-4 transition hover:border-violet-500">
      {children}
    </button>
  );
}