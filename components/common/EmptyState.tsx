import { type LucideIcon, PackageSearch } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = PackageSearch,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-4 gap-4",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Icon size={28} className="text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="font-heading font-semibold text-base">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {description}
          </p>
        )}
      </div>
      {actionLabel && actionHref && (
        <a href={actionHref} className={buttonVariants({ variant: "outline" })}>
          {actionLabel}
        </a>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} className={buttonVariants({ variant: "outline" })}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
