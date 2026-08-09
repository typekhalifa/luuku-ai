interface Props {
  children: React.ReactNode;
  className?: string;
}

export function Section({
  children,
  className = "",
}: Props) {
  return (
    <section
      className={`py-20 md:py-28 lg:py-32 ${className}`}
    >
      {children}
    </section>
  );
}