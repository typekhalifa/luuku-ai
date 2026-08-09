"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const introY = useTransform(scrollYProgress, [0, 0.18, 0.38], [0, -40, -150]);
  const introOpacity = useTransform(scrollYProgress, [0, 0.16, 0.34], [1, 1, 0]);
  const introScale = useTransform(scrollYProgress, [0, 0.35], [1, 0.96]);

  const videoWidth = useTransform(scrollYProgress, [0.18, 0.62], ["100%", "88%"]);
  const videoHeight = useTransform(scrollYProgress, [0.18, 0.62], ["100%", "78%"]);
  const videoX = useTransform(scrollYProgress, [0.18, 0.62], ["0%", "6%"]);
  const videoY = useTransform(scrollYProgress, [0.18, 0.62], ["0%", "8%"]);
  const videoRadius = useTransform(scrollYProgress, [0.18, 0.62], ["0px", "28px"]);
  const videoScale = useTransform(scrollYProgress, [0, 0.25, 0.62, 1], [1, 1.02, 1, 0.98]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.3, 0.65, 1], [0.2, 0.38, 0.5, 0.68]);

  const systemOpacity = useTransform(scrollYProgress, [0.34, 0.5, 0.76], [0, 1, 1]);
  const systemY = useTransform(scrollYProgress, [0.34, 0.52], [70, 0]);
  const systemScale = useTransform(scrollYProgress, [0.34, 0.52], [0.96, 1]);
  const systemLabelOpacity = useTransform(scrollYProgress, [0.46, 0.58], [0, 1]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[220svh] overflow-hidden bg-black text-white"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div
          style={{
            width: videoWidth,
            height: videoHeight,
            x: videoX,
            y: videoY,
            scale: videoScale,
            borderRadius: videoRadius,
          }}
          className="absolute left-0 top-0 origin-center overflow-hidden"
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

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/80" />
        <motion.div style={{ opacity: overlayOpacity }} className="pointer-events-none absolute inset-0 bg-black" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_16%,rgba(0,0,0,.5)_100%)]" />

        <motion.div
          style={{ y: introY, opacity: introOpacity, scale: introScale }}
          className="absolute inset-0 z-10 flex items-center"
        >
          <div className="mx-auto w-full max-w-[1500px] px-6 lg:px-10">
            <div className="max-w-6xl">
              <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.38em] text-white/55 sm:text-[11px]">
                LUUKU AI SYSTEMS · KIGALI
              </p>

              <h1 className="max-w-6xl text-[clamp(3.25rem,8vw,7.5rem)] font-medium leading-[0.88] tracking-[-0.045em] text-white">
                Engineering autonomous AI systems for Africa.
              </h1>

              <div className="mt-8 flex max-w-2xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <p className="max-w-xl text-base leading-7 text-white/65 sm:text-lg">
                  We design, deploy and maintain AI infrastructure that connects
                  intelligence, orchestration and execution to real business operations.
                </p>

                <Link
                  href="#systems"
                  className="group inline-flex shrink-0 items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white/80 transition-colors hover:text-white"
                >
                  Explore systems
                  <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          style={{ opacity: systemOpacity, y: systemY, scale: systemScale }}
          className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-[1500px] items-end px-6 pb-10 lg:px-10 lg:pb-12"
        >
          <div className="w-full">
            <motion.p
              style={{ opacity: systemLabelOpacity }}
              className="mb-4 font-mono text-[10px] uppercase tracking-[0.35em] text-white/45 sm:text-[11px]"
            >
              From intelligence to execution
            </motion.p>

            <div className="flex flex-col gap-6 border-t border-white/15 pt-5 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="max-w-4xl text-3xl font-medium leading-[0.95] tracking-[-0.03em] sm:text-4xl md:text-5xl lg:text-6xl">
                AI systems built to operate in the real world.
              </h2>

              <div className="max-w-sm text-sm leading-6 text-white/55">
                Intelligence understands. Orchestration coordinates. Execution moves the work forward.
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          style={{ opacity: introOpacity }}
          className="absolute bottom-8 right-6 z-10 hidden items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-white/40 sm:flex lg:right-10"
        >
          <span>Scroll to explore</span>
          <span className="h-8 w-px bg-white/30" />
        </motion.div>
      </div>
    </section>
  );
}
