import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 text-2xl font-semibold text-black"
    >
      <img
        src="/logo.svg"
        alt="Luuku"
        className="h-7 w-7"
      />

      <span>Luuku</span>
    </Link>
  );
}