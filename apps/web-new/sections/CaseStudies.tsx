"use client";

import { useState } from "react";
import { motion, animate, useMotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CASES = [
  {
    org: "Rwanda Agriculture Board",
    quote:
      "Reducing post-harvest losses by 34% through predictive logistics AI deployed across 12 districts.",
  },
  {
    org: "Bank of Kigali",
    quote:
      "Automated credit risk assessment for agricultural SME lending, cutting approval time from weeks to hours.",
  },
  {
    org: "Northern Corridor",
    quote:
      "Real-time autonomous dispatch coordinating five East African borders with 99.2% on-time delivery.",
  },
  {
    org: "Ministry of ICT",
    quote:
      "National document intelligence system processing more than two million citizen records with zero-downtime deployment.",
  },
  {
    org: "One Acre Fund",
    quote:
      "Satellite-derived yield prediction models serving over 200,000 smallholder farmers in the Great Lakes region.",
  },
];

const CARD_WIDTH = 456;

export function CaseStudies() {
  const [current, setCurrent] = useState(0);

  const x = useMotionValue(0);

  function goTo(index: number) {
    const next =
      (index + CASES.length) % CASES.length;

    setCurrent(next);

    animate(
      x,
      -(next * CARD_WIDTH),
      {
        type: "spring",
        stiffness: 260,
        damping: 32,
      }
    );
  }

  return (
    <section
      id="cases"
      className="bg-luuku-900 py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">

        {/* Header */}

        <div className="mb-14 flex items-end justify-between">

          <div>

            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.35em] text-accent-gold">
              CASE STUDIES
            </p>

            <h2 className="max-w-3xl text-4xl font-medium leading-[1] text-luuku-50 lg:text-5xl">
              AI systems delivering
              <br />
              measurable outcomes.
            </h2>

          </div>

          <div className="hidden items-center gap-4 md:flex">

            <span className="font-mono text-xs tracking-[0.25em] text-luuku-100/40">

              {(current + 1)
                .toString()
                .padStart(2, "0")}

              /

              {CASES.length
                .toString()
                .padStart(2, "0")}

            </span>

            <button
              onClick={() => goTo(current - 1)}
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/15 transition hover:bg-white hover:text-black"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={() => goTo(current + 1)}
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/15 transition hover:bg-white hover:text-black"
            >
              <ChevronRight size={20} />
            </button>

          </div>

        </div>

      </div>

      {/* Carousel */}

      <div className="overflow-hidden">

        <motion.div
          drag="x"
          dragElastic={0.08}
          dragConstraints={{
            left: -(CARD_WIDTH * (CASES.length - 1)),
            right: 0,
          }}
          style={{ x }}
          className="flex gap-8 px-6 cursor-grab active:cursor-grabbing"
        >

          {CASES.map((item) => (

            <motion.article
              key={item.org}
              whileHover={{
                y: -8,
              }}
              transition={{
                duration: 0.25,
              }}
              className="flex h-[430px] w-[88vw] shrink-0 flex-col justify-between rounded-[32px] border border-white/5 bg-luuku-800 p-8 shadow-2xl sm:w-[440px]"
            >

              <div>

                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-luuku-950">

                    <div className="h-5 w-5 rounded bg-accent-gold/50" />

                  </div>

                  <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-luuku-100/40">
                    {item.org}
                  </span>

                </div>

                <h3 className="mt-10 text-2xl font-medium leading-relaxed text-luuku-50">
                  {item.quote}
                </h3>

              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-6">

                <span className="text-sm text-luuku-100/40">
                  View Architecture
                </span>

                <span className="text-accent-gold text-xl">
                  →
                </span>

              </div>

            </motion.article>

          ))}

        </motion.div>

      </div>

    </section>
  );
}