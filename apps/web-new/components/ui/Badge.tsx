interface Props {
  children: React.ReactNode;
}

export function Badge({ children }: Props) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-luuku-100 backdrop-blur">
      {children}
    </span>
  );
}