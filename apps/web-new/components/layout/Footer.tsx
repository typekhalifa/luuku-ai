import Link from "next/link";

const products = [
  "Luuku Labs",
  "Luuku Mag",
  "LuukuFX",
  "Luuku Clothing",
];

const solutions = [
  "Enterprise AI",
  "Agriculture",
  "Finance",
  "Healthcare",
  "Government",
  "Education",
];

const developers = [
  "API Documentation",
  "SDKs",
  "Developer Guides",
  "API Reference",
  "System Status",
  "GitHub",
];

const company = [
  "About",
  "Case Studies",
  "Research",
  "Careers",
  "Partners",
  "Contact",
];

const resources = [
  "Africa Signals",
  "Field Notes",
  "Architecture Papers",
  "Documentation",
  "Blog",
];

const guides = [
  "AI Systems",
  "AI Agents",
  "Automation",
  "Large Language Models",
  "Retrieval Augmented Generation",
  "Prompt Engineering",
];

function Column({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <h4 className="mb-6 text-[11px] font-medium uppercase tracking-[0.32em] text-white/30">
        {title}
      </h4>

      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item}
            href="/"
            className="block text-[15px] leading-7 text-white/90 transition hover:text-accent-gold"
          >
            {item}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer
      id="footer"
      className="border-t border-white/5 bg-luuku-950"
    >
      <div className="mx-auto max-w-screen-2xl px-8 py-28">

        {/* Navigation */}

        <div className="grid gap-16 xl:grid-cols-[160px_repeat(6,1fr)]">

          <div>

            <Link
              href="/"
              className="text-2xl font-semibold text-white"
            >
              Luuku
            </Link>

          </div>

          <Column title="Products" items={products} />

          <Column title="Solutions" items={solutions} />

          <Column title="Developers" items={developers} />

          <Column title="Company" items={company} />

          <Column title="Resources" items={resources} />

          <Column title="Guides" items={guides} />

        </div>

        {/* Divider */}

        <div className="my-24 h-px bg-white/5" />

        {/* Big Statement */}

        <div className="py-10">

          <h2 className="max-w-[1500px] text-[56px] font-medium leading-[0.88] tracking-tight text-white/8 sm:text-7xl lg:text-[96px] xl:text-[118px]">

            Practical AI systems
            <br />
            for African business.

          </h2>

        </div>

        {/* Divider */}

        <div className="my-20 h-px bg-white/5" />

        {/* Bottom */}

        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex flex-wrap gap-8 text-sm text-white/40">

            <span>© 2026 Luuku AI</span>

            <span>Kigali, Rwanda</span>

            <Link href="/">Privacy</Link>

            <Link href="/">Terms</Link>

            <Link href="/">Security</Link>

            <Link href="/">Status</Link>

          </div>

          <p className="text-[11px] uppercase tracking-[0.32em] text-white/30">

            BUILT IN KIGALI · ENGINEERED FOR AFRICA

          </p>

        </div>

      </div>
    </footer>
  );
}