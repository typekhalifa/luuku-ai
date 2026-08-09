interface Props {
  children: React.ReactNode;
  className?: string;
}

export function Container({
  children,
  className = "",
}: Props) {
  return (
    <div
      className={`mx-auto w-full max-w-[1440px] px-5 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}