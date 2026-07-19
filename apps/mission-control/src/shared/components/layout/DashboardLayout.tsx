import type { ReactNode } from "react";

import { CommandPalette } from "@/shared/command";
import { AICopilot } from "@/shared/components/copilot";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <>
      <CommandPalette />

      <main className="min-h-screen bg-[#070707] text-white">

        <div className="mx-auto max-w-[1850px] p-8">

          <div className="grid gap-8 xl:grid-cols-[1fr_380px]">

            <div>

              {children}

            </div>

            <div className="hidden xl:block">

              <div className="sticky top-8 h-[calc(100vh-64px)]">

                <AICopilot />

              </div>

            </div>

          </div>

        </div>

      </main>

    </>
  );
}