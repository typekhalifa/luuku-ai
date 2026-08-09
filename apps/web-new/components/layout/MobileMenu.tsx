"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const links = [
  { label: "Systems", href: "#systems" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Case Studies", href: "#cases" },
  { label: "Contact", href: "#footer" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: Props) {
  return (
    <AnimatePresence>

      {open && (

        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25 }}
          className="border-b border-black/10 bg-white lg:hidden"
        >

          <div className="px-6 py-6">

            {links.map((link) => (

              <Link
                key={link.label}
                href={link.href}
                onClick={onClose}
                className="flex items-center justify-between border-b border-black/10 py-6 text-xl font-medium text-black"
              >

                {link.label}

                <ArrowRight size={18} />

              </Link>

            ))}

            <Link
              href="/demo"
              onClick={onClose}
              className="mt-8 flex h-14 items-center justify-center rounded-full bg-black text-base font-semibold text-white"
            >
              Book Demo →
            </Link>

          </div>

        </motion.div>

      )}

    </AnimatePresence>
  );
}