import Link from "next/link";

type Props = {
  href?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
};

export function Button({
  href,
  children,
  variant = "primary",
}: Props) {
  const style =
    variant === "primary"
      ? "bg-accent-gold text-black hover:scale-[.98]"
      : "border border-luuku-100/15 text-luuku-50 hover:bg-white/5";

  if (href)
    return (
      <Link
        href={href}
        className={`rounded-full px-6 py-3 font-medium transition ${style}`}
      >
        {children}
      </Link>
    );

  return (
    <button
      className={`rounded-full px-6 py-3 font-medium transition ${style}`}
    >
      {children}
    </button>
  );
}