import { SafeImage } from "@/components/common/SafeImage";
import { cn } from "@/lib/utils";
import { categoryInitial } from "./categoryImage";

interface CategoryTileProps {
  name: string;
  imageUrl: string | null;
  className?: string;
  sizes?: string;
}

/** Uploaded image, or a brand-tinted initial when the category has none (never a stock placeholder). */
export function CategoryTile({ name, imageUrl, className, sizes = "48px" }: CategoryTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 font-heading font-bold text-primary",
        className
      )}
    >
      {imageUrl ? (
        <SafeImage src={imageUrl} alt="" fill className="object-cover" sizes={sizes} />
      ) : (
        categoryInitial(name)
      )}
    </span>
  );
}
