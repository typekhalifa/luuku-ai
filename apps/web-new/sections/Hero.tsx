"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const videoScale = useTransform(
    scrollYProgress,
    [0, 1],
    [1, 1.08]
  );

  const contentY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, -120]
  );

  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.7],
    [1, 0]
  );

  const overlayOpacity = useTransform(
    scrollYProgress,
    [0, 0.8],
    [0.25, 0.65]
  );

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[105svh] overflow-hidden bg-black"
    >
      {/* Video */}

      <motion.div
        style={{ scale: videoScale }}
        className="absolute inset-0"
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/hero/poster.jpg"
          className="h-full w-full object-cover"
        >
          <source
            src="/hero/founder.mp4"
            type="video/mp4"
          />
        </video>
      </motion.div>

      {/* Cinematic overlays */}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-black/80" />

      <motion.div
        style={{ opacity: overlayOpacity }}
        className="pointer-events-none absolute inset-0 bg-black"
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,.45)_100%)]" />

      {/* Content */}

      <motion.div
        style={{
          y: contentY,
          opacity: contentOpacity,
        }}
        className="relative z-10 flex min-h-[105svh] items-end"
      >
        <div className="mx-auto w-full max-w-[1500px] px-6 pb-20 sm:pb-24 lg:px-10 lg:pb-28">

          <div className="max-w-4xl">

            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.35em] text-white/60 sm:text-[11px]">
              LUUKU AI SYSTEMS
            </p>

            <h1 className="max-w-4xl text-4xl font-medium leading-[0.95] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-[82px]">
              Engineering autonomous AI systems for Africa.
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
              We design, deploy and maintain practical AI infrastructure
              that automates operations, supports decisions and unlocks
              growth.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">

              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-full bg-accent-gold px-6 py-3 text-sm font-medium text-black transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(212,160,23,.3)]"
              >
                Book Demo
                <ArrowRight size={16} />
              </Link>

              <Link
                href="#systems"
                className="inline-flex items-center rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10"
              >
                Explore Systems
              </Link>

            </div>

          </div>
        </div>
      </motion.div>

      {/* Scroll indicator */}

      <motion.div
        style={{ opacity: contentOpacity }}
        className="absolute bottom-8 right-6 z-10 hidden items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-white/40 sm:flex lg:right-10"
      >
        <span>Scroll</span>
        <span className="h-8 w-px bg-white/30" />
      </motion.div>

    </section>
  );
}