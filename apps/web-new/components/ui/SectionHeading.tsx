interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: Props) {
  return (
    <div className="max-w-3xl">

      {eyebrow && (
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-accent-gold">
          {eyebrow}
        </p>
      )}

      <h2 className="text-3xl font-medium leading-tight tracking-tight text-luuku-50 md:text-5xl">
        {title}
      </h2>

      {description && (
        <p className="mt-6 text-base leading-8 text-luuku-100/60 md:text-lg">
          {description}
        </p>
      )}

    </div>
  );
}