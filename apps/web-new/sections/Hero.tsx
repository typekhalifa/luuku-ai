"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

const layers = [
  { label: "MEMORY", x: -150, y: -34, rotate: -4 },
  { label: "ORCHESTRATION", x: 150, y: -8, rotate: 4 },
  { label: "EXECUTION", x: 110, y: 48, rotate: 3 },
  { label: "TOOLS", x: -120, y: 54, rotate: -3 },
];

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Phase 1 — establish the real-world visual.
  const introOpacity = useTransform(scrollYProgress, [0, 0.16, 0.28], [1, 1, 0]);
  const introY = useTransform(scrollYProgress, [0, 0.28], [0, -90]);
  const heroVideoScale = useTransform(scrollYProgress, [0, 0.25, 0.5], [1, 1.04, 0.92]);
  const heroVideoRadius = useTransform(scrollYProgress, [0.18, 0.42], [0, 24]);
  const heroVideoWidth = useTransform(scrollYProgress, [0.2, 0.48], ["100%", "72%"]);
  const heroVideoHeight = useTransform(scrollYProgress, [0.2, 0.48], ["100%", "68%"]);
  const heroVideoX = useTransform(scrollYProgress, [0.2, 0.48], ["0%", "14%"]);
  const heroVideoY = useTransform(scrollYProgress, [0.2, 0.48], ["0%", "5%"]);

  // Phase 2 — the real-world image becomes a system of layers.
  const systemOpacity = useTransform(scrollYProgress, [0.22, 0.36, 0.82], [0, 1, 1]);
  const systemScale = useTransform(scrollYProgress, [0.22, 0.48], [0.72, 1]);
  const systemY = useTransform(scrollYProgress, [0.22, 0.48], [80, 0]);
  const panelOpacity = useTransform(scrollYProgress, [0.3, 0.44, 0.9], [0, 1, 1]);
  const systemCopyOpacity = useTransform(scrollYProgress, [0.48, 0.58, 0.82], [0, 1, 1]);
  const systemCopyY = useTransform(scrollYProgress, [0.48, 0.62], [35, 0]);

  // Phase 3 — prepare the handoff into the next section.
  const handoffOpacity = useTransform(scrollYProgress, [0.82, 0.94, 1], [1, 1, 0]);
  const handoffY = useTransform(scrollYProgress, [0.82, 1], [0, -55]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[300svh] overflow-hidden bg-black text-white"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Real-world opening */}
        <motion.div
          style={{
            width: heroVideoWidth,
            height: heroVideoHeight,
            x: heroVideoX,
            y: heroVideoY,
            scale: heroVideoScale,
            borderRadius: heroVideoRadius,
          }}
          className="absolute left-0 top-0 overflow-hidden bg-black"
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/hero/poster.png"
            className="h-full w-full object-cover"
          >
            <source src="/hero/founder.mp4" type="video/mp4" />
          </video>
        </motion.div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/5 to-black/75" />
        <motion.div
          style={{ opacity: useTransform(scrollYProgress, [0, 0.45], [0.18, 0.8]) }}
          className="pointer-events-none absolute inset-0 bg-black"
        />

        <motion.div
          style={{ opacity: introOpacity, y: introY }}
          className="absolute inset-0 z-20 flex items-end"
        >
          <div className="mx-auto w-full max-w-[1500px] px-6 pb-14 sm:pb-16 lg:px-10 lg:pb-20">
            <div className="max-w-6xl">
              <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.38em] text-white/55 sm:text-[11px]">
                LUUKU AI SYSTEMS · KIGALI
              </p>
              <h1 className="max-w-6xl text-[clamp(3.2rem,8vw,7.6rem)] font-medium leading-[0.87] tracking-[-0.05em]">
                Engineering autonomous AI systems for Africa.
              </h1>
              <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <p className="max-w-xl text-base leading-7 text-white/65 sm:text-lg">
                  Infrastructure that connects intelligence, orchestration and execution to real business operations.
                </p>
                <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-white/45">
                  <span className="h-px w-8 bg-white/30" />
                  Scroll to enter the system
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Layered system reveal */}
        <motion.div
          style={{ opacity: systemOpacity, scale: systemScale, y: systemY }}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <div className="relative h-[55vh] w-[min(900px,88vw)] [perspective:1400px]">
            {layers.map((layer, index) => (
              <motion.div
                key={layer.label}
                style={{
                  x: useTransform(scrollYProgress, [0.28, 0.56], [0, layer.x]),
                  y: useTransform(scrollYProgress, [0.28, 0.56], [0, layer.y]),
                  rotate: useTransform(scrollYProgress, [0.28, 0.56], [0, layer.rotate]),
                  opacity: panelOpacity,
                }}
                className="absolute inset-0 overflow-hidden rounded-[18px] border border-white/15 bg-white/[0.025] shadow-2xl"
              >
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover opacity-[0.18] grayscale"
                >
                  <source src={index % 2 === 0 ? "/hero/kigali-aerial.mp4" : "/hero/founder.mp4"} type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-black/55" />
                <div className="absolute left-5 top-5 flex items-center gap-2 font-mono text-[9px] tracking-[0.25em] text-white/45">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                  {layer.label}
                </div>
                <div className="absolute inset-x-5 bottom-5 h-px bg-white/10" />
                <div className="absolute bottom-7 left-5 right-5 grid grid-cols-3 gap-2 opacity-50">
                  <span className="h-1 bg-white/20" />
                  <span className="h-1 bg-white/10" />
                  <span className="h-1 bg-white/15" />
                </div>
              </motion.div>
            ))}

            <motion.div
              style={{
                opacity: panelOpacity,
                scale: useTransform(scrollYProgress, [0.28, 0.52], [0.86, 1]),
              }}
              className="absolute inset-[12%] overflow-hidden rounded-[18px] border border-white/25 bg-black shadow-[0_30px_120px_rgba(0,0,0,.8)]"
            >
              <video
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover opacity-35 grayscale"
              >
                <source src="/hero/kigali-aerial.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-black/45" />
              <div className="absolute left-6 top-6 font-mono text-[9px] uppercase tracking-[0.28em] text-white/55">
                LUUKU RUNTIME · ACTIVE
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
                  <div>INPUT</div>
                  <div className="mt-2 text-white/80">KNOWLEDGE + SIGNALS</div>
                </div>
                <div className="hidden h-px flex-1 bg-white/15 sm:block" />
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
                  <div>OUTPUT</div>
                  <div className="mt-2 text-white/80">ACTION + DECISION</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          style={{ opacity: systemCopyOpacity, y: systemCopyY }}
          className="absolute bottom-10 left-0 right-0 z-30 mx-auto max-w-[1500px] px-6 lg:px-10"
        >
          <div className="flex flex-col gap-5 border-t border-white/15 pt-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                From intelligence to execution
              </p>
              <h2 className="max-w-3xl text-3xl font-medium leading-[0.94] tracking-[-0.035em] sm:text-4xl md:text-5xl lg:text-6xl">
                AI systems that actually work.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-white/45">
              Memory. Tools. Orchestration. Runtime. Every layer designed to move work forward.
            </p>
          </div>
        </motion.div>

        <motion.div
          style={{ opacity: handoffOpacity, y: handoffY }}
          className="absolute bottom-8 right-6 z-40 hidden items-center gap-3 font-mono text-[9px] uppercase tracking-[0.28em] text-white/35 sm:flex lg:right-10"
        >
          <span>Continue</span>
          <ArrowRight size={13} />
        </motion.div>
      </div>
    </section>
  );
}
