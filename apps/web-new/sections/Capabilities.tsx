"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  MotionValue,
  useScroll,
  useTransform,
} from "framer-motion";

const VERTICALS = [
  { word: "Agriculture", color: "#7C9A6B" },
  { word: "Logistics", color: "#D4A017" },
  { word: "Healthcare", color: "#B85450" },
  { word: "Finance", color: "#7C9A6B" },
  { word: "Government", color: "#D4A017" },
  { word: "Energy", color: "#B85450" },
  { word: "Education", color: "#7C9A6B" },
];

const CARDS = [
  "Predictive Agriculture",
  "Autonomous Logistics",
  "Clinical Intelligence",
  "Risk Intelligence",
  "Smart Governance",
  "Grid Optimization",
];

const CARD_POSITIONS = [
  { left: "50%", top: "14%" },
  { left: "80%", top: "30%" },
  { left: "80%", top: "70%" },
  { left: "50%", top: "86%" },
  { left: "20%", top: "70%" },
  { left: "20%", top: "30%" },
];

export function Capabilities() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const rotation = useTransform(scrollYProgress, [0, 1], [0, 360]);

  return (
    <section
      ref={sectionRef}
      id="capabilities"
      className="relative overflow-hidden bg-luuku-900 py-24"
    >
      <CapabilityOrbit progress={rotation} />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 text-center">

        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.30em] text-accent-gold">
          SYSTEMS
        </p>

        <h2 className="max-w-4xl text-3xl font-medium leading-[0.95] tracking-tight text-luuku-50 sm:text-5xl lg:text-6xl">
          Engineering Artificial Intelligence
          <br />

          <span className="text-luuku-100/30">
            for{" "}
          </span>

          <WordRotator />
        </h2>

        <p className="mt-7 max-w-xl text-base leading-7 text-luuku-100/60">
          Practical AI infrastructure that automates operations,
          accelerates decisions and creates measurable value for
          businesses, governments and institutions across Africa.
        </p>

        <button
          className="
            mt-8
            inline-flex
            items-center
            gap-2
            rounded-full
            bg-accent-gold
            px-6
            py-3
            text-sm
            font-medium
            text-black
            transition-all
            duration-300
            hover:-translate-y-1
            hover:shadow-[0_14px_40px_rgba(212,160,23,.25)]
          "
        >
          Get Started

          <span className="text-base">
            →
          </span>

        </button>

      </div>
    </section>
  );
}

function WordRotator() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % VERTICALS.length);
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  return (
    <span className="relative inline-block min-w-[240px] overflow-hidden align-bottom">

      {VERTICALS.map((item, index) => (
        <motion.span
          key={item.word}
          className="absolute left-0 top-0 w-full"
          initial={false}
          animate={{
            y: index === active ? 0 : 56,
            opacity: index === active ? 1 : 0,
          }}
          transition={{ duration: 0.45 }}
          style={{
            color: item.color,
          }}
        >
          {item.word}
        </motion.span>
      ))}

      <span className="invisible">
        Agriculture
      </span>

    </span>
  );
}

function CapabilityOrbit({
  progress,
}: {
  progress: MotionValue<number>;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">

      <motion.div
        style={{ rotate: progress }}
        className="relative h-[600px] w-[760px]"
      >

        {CARDS.map((card, index) => {
          const position = CARD_POSITIONS[index];

          return (
            <motion.div
              key={card}
              className="absolute h-20 w-20 rounded-2xl border border-white/5 bg-luuku-800 shadow-xl backdrop-blur-sm"
              style={{
                left: position.left,
                top: position.top,
                x: "-50%",
                y: "-50%",
              }}
              whileHover={{
                scale: 1.05,
              }}
            >
              <div className="flex h-full items-center justify-center rounded-2xl bg-gradient-to-br from-accent-gold/20 to-transparent p-2 text-center text-[10px] font-medium leading-tight text-luuku-100">
                {card}
              </div>
            </motion.div>
          );
        })}

      </motion.div>

    </div>
  );
}