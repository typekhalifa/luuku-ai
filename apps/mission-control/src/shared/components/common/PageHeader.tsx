interface PageHeaderProps {

    eyebrow?: string;

    title: string;

    description: string;

}

export default function PageHeader({

    eyebrow,

    title,

    description,

}: PageHeaderProps) {

    return (

        <div className="space-y-3">

            {eyebrow && (

                <p className="tracking-[.35em] uppercase text-neutral-500">

                    {eyebrow}

                </p>

            )}

            <h1 className="text-6xl font-bold tracking-tight">

                {title}

            </h1>

            <p className="max-w-3xl text-lg text-neutral-400">

                {description}

            </p>

        </div>

    );

}