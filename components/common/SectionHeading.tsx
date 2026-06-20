import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  id?: string;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  id,
  className,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div className={cn(centered && "text-center", className)}>
      <div className="inline-flex items-center gap-3 mb-2">
        <span className="h-px w-6 bg-brand-orange" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">
          {eyebrow}
        </span>
        <span className="h-px w-6 bg-brand-orange" aria-hidden="true" />
      </div>
      <h2 id={id} className="font-heading font-bold text-2xl lg:text-3xl">
        {title}
      </h2>
      {description && (
        <p className={cn("text-muted-foreground mt-2 text-sm", centered && "max-w-md mx-auto")}>
          {description}
        </p>
      )}
    </div>
  );
}
