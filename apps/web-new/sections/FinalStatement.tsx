"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SplineScene } from "@/components/ui/SplineScene";

export function FinalStatement() {
  return (
    <section className="relative overflow-hidden bg-luuku-950 py-24 lg:py-32">

      <div className="mx-auto grid max-w-[1500px] items-center gap-12 px-6 lg:grid-cols-12 lg:px-10">

        {/* Left */}

        <div className="lg:col-span-5">

          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.35em] text-accent-gold">
            READY
          </p>

          <h2 className="max-w-xl text-5xl font-medium leading-[0.95] tracking-tight text-luuku-50 lg:text-6xl">

            Focus on your business.

            <span className="mt-2 block text-accent-gold">

              We'll run the systems.

            </span>

          </h2>

          <p className="mt-8 max-w-md text-base leading-8 text-luuku-100/60">

            Autonomous AI infrastructure that works
            around the clock—so your team can focus
            on growing the business.

          </p>

          <Link
            href="/contact"
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-accent-gold px-6 py-3.5 font-medium text-black transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(212,160,23,.25)]"
          >
            Get Started

            <ArrowRight size={18} />

          </Link>

        </div>

        {/* Right */}

        <div className="lg:col-span-7">

          <div className="overflow-hidden rounded-[40px] border border-white/5 bg-[#09090d]">

            <SplineScene />

          </div>

        </div>

      </div>

    </section>
  );
}