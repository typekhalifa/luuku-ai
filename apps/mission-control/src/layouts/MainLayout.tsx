import type { ReactNode } from "react";

import AmbientBackground from "@/shared/components/common/AmbientBackground";
import Shell from "@/shared/components/layout/Shell";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({
  children,
}: MainLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060A] text-white">

      <AmbientBackground />

      <div className="relative z-10">

        <Shell>

          {children}

        </Shell>

      </div>

    </div>
  );
}