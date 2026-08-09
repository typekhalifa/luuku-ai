"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const systems = [
  {
    status: "LIVE",
    color: "bg-emerald-500",
    title: "Luuku Operator",
    description:
      "Qualifies leads, drafts proposals, schedules meetings and coordinates delivery across the company.",
    metrics: [
      { label: "Response", value: "<30 sec" },
      { label: "Automation", value: "92%" },
      { label: "Status", value: "Online" },
    ],
    dark: false,
  },
  {
    status: "ACTIVE",
    color: "bg-blue-500",
    title: "Research Engine",
    description:
      "Continuously researches AI companies, African markets and enterprise opportunities for our clients.",
    metrics: [
      { label: "Sources", value: "1.2k+" },
      { label: "Updates", value: "Daily" },
      { label: "Coverage", value: "Africa" },
    ],
    dark: false,
  },
  {
    status: "INTERNAL",
    color: "bg-yellow-400",
    title: "Executive AI",
    description:
      "Coordinates documentation, planning and executive workflows across Luuku.",
    metrics: [
      { label: "Tasks/day", value: "340+" },
      { label: "Review", value: "Human" },
      { label: "Availability", value: "24/7" },
    ],
    dark: true,
  },
];

export function BuiltInProduction() {
  return (
    <section className="bg-white py-28">

      <div className="mx-auto max-w-[1500px] px-6">

        <div className="mb-20 grid gap-12 lg:grid-cols-12">

          <div className="lg:col-span-7">

            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.32em] text-accent-gold">
              BUILT IN PRODUCTION
            </p>

            <h2 className="max-w-4xl text-5xl font-medium leading-[0.92] tracking-tight text-black lg:text-7xl">

              We use our own systems before we build yours.

            </h2>

          </div>

          <div className="flex items-end lg:col-span-5">

            <p className="max-w-md text-lg leading-9 text-neutral-600">

              Every workflow we recommend to clients is first deployed inside
              Luuku. Our own company is the proving ground for every autonomous
              system we ship.

            </p>

          </div>

        </div>

        <div className="grid gap-6 lg:grid-cols-3">

          {systems.map((system) => (

            <motion.article
              key={system.title}
              whileHover={{ y: -8 }}
              transition={{ duration: .25 }}
              className={`rounded-[32px] border p-9 ${
                system.dark
                  ? "border-neutral-900 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-neutral-50 text-black"
              }`}
            >

              <div className="mb-12 flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <span
                    className={`h-2.5 w-2.5 rounded-full ${system.color}`}
                  />

                  <span className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-70">

                    {system.status}

                  </span>

                </div>

                <ArrowUpRight
                  size={18}
                  className="opacity-50"
                />

              </div>

              <h3 className="text-4xl font-medium tracking-tight">

                {system.title}

              </h3>

              <p className="mt-6 leading-8 opacity-75">

                {system.description}

              </p>

              <div className="mt-12 border-t border-current/10 pt-8">

                <div className="grid grid-cols-3 gap-6">

                  {system.metrics.map((metric) => (

                    <div key={metric.label}>

                      <p className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-50">

                        {metric.label}

                      </p>

                      <p className="mt-3 text-xl font-medium">

                        {metric.value}

                      </p>

                    </div>

                  ))}

                </div>

              </div>

            </motion.article>

          ))}

        </div>

      </div>

    </section>
  );
}