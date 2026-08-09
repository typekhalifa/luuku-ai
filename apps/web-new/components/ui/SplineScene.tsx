"use client";

export function SplineScene() {
  return (
    <div className="relative flex h-[520px] items-center justify-center overflow-hidden">

      {/* Glow */}

      <div className="absolute h-80 w-80 rounded-full bg-accent-gold/10 blur-[120px]" />

      {/* Placeholder */}

      <div className="relative flex flex-col items-center">

        <div className="h-24 w-24 rounded-full bg-accent-gold shadow-[0_0_80px_rgba(212,160,23,.35)]" />

        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.45em] text-white/30">
          LUUKU AI ECOSYSTEM
        </p>

      </div>

    </div>
  );
}