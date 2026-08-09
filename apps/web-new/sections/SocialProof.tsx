"use client";

import { motion } from "framer-motion";

export function SocialProof() {
  return (
    <section
      id="systems"
      className="bg-white py-24 sm:py-32"
    >
      <div className="mx-auto grid max-w-[1440px] items-center gap-20 px-5 sm:px-6 lg:grid-cols-12 lg:px-8">

        {/* Left */}

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .7 }}
          className="lg:col-span-5"
        >

          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.32em] text-accent-gold">
            WHY LUUKU
          </p>

          <h2 className="text-4xl font-medium leading-[0.95] tracking-tight text-black sm:text-5xl">
            Built where real infrastructure meets real constraints.
          </h2>

          <p className="mt-8 text-base leading-8 text-neutral-600">

            AI shouldn't only work in Silicon Valley.

            We engineer practical AI systems designed for the realities of
            African businesses, governments and institutions—where reliability,
            infrastructure and operational efficiency matter every day.

          </p>

        </motion.div>

        {/* Right */}

        <motion.div
          initial={{ opacity: 0, scale: .98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: .8 }}
          className="w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-neutral-50 lg:col-span-7"
        >

          <div className="aspect-[16/10] w-full">

            <video
              autoPlay
              muted
              loop
              playsInline
              className="block h-full w-full object-cover"
            >
              <source
                src="/hero/kigali-aerial.mp4"
                type="video/mp4"
              />
            </video>

          </div>

          <div className="grid gap-6 border-t border-neutral-200 p-8 sm:grid-cols-3">

            <div>

              <p className="text-3xl font-medium text-black">
                AI
              </p>

              <p className="mt-2 text-sm text-neutral-500">
                Enterprise Systems
              </p>

            </div>

            <div>

              <p className="text-3xl font-medium text-black">
                Ops
              </p>

              <p className="mt-2 text-sm text-neutral-500">
                Autonomous Workflows
              </p>

            </div>

            <div>

              <p className="text-3xl font-medium text-black">
                Data
              </p>

              <p className="mt-2 text-sm text-neutral-500">
                Decision Intelligence
              </p>

            </div>

          </div>

        </motion.div>

      </div>
    </section>
  );
}