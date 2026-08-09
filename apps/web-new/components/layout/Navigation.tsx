"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";

import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

const links = [
  { label: "Systems", href: "#systems" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Case Studies", href: "#cases" },
  { label: "Contact", href: "#footer" },
];

export function Navigation() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
  });

  return (
    <>
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45 }}
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-black/10 bg-white/80 backdrop-blur-xl"
            : "bg-white"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-6 lg:px-8">

          {/* LEFT */}

          <div className="flex items-center gap-12">

            <Logo />

            <nav className="hidden lg:flex items-center gap-9">

              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-[15px] font-medium text-black/75 transition hover:text-black"
                >
                  {link.label}
                </Link>
              ))}

            </nav>

          </div>

          {/* RIGHT */}

          <div className="flex items-center gap-3">

            <Link
              href="/contact"
              className="hidden lg:block text-[15px] font-medium text-black/70 transition hover:text-black"
            >
              Contact Sales
            </Link>

            <Link
              href="/demo"
              className="
                rounded-full
                bg-black
                px-6
                py-3
                text-sm
                font-semibold
                text-white
                transition
                hover:opacity-90
              "
            >
              <span className="hidden sm:inline">
                Book Demo →
              </span>

              <span className="sm:hidden">
                Book Demo
              </span>

            </Link>

            <button
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                border
                border-black/10
                bg-neutral-100
                text-black
                transition-all
                duration-200
                hover:bg-neutral-200
                lg:hidden
              "
            >
              {open ? (
                <X className="h-5 w-5 text-black" strokeWidth={2.3} />
              ) : (
                <Menu className="h-5 w-5 text-black" strokeWidth={2.3} />
              )}
            </button>

          </div>

        </div>
      </motion.header>

      <MobileMenu
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}