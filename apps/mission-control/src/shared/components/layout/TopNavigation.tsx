import {
  Bell,
  Search,
  Settings,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";

import { api } from "@/services/api";

export default function TopNavigation() {
  async function logout() {
    await api<void>("/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.reload();
  }
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

        <button
          onClick={logout}
          title="Sign out"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#111] text-white/70 transition hover:border-violet-500 hover:text-white"
        >
          <LogOut size={18} />
        </button>

      </div>

    </header>
  );
}

function IconButton({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <button className="rounded-2xl border border-white/10 bg-[#111] p-4 transition hover:border-violet-500">
      {children}
    </button>
  );
}