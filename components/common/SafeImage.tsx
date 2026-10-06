"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type ReactEventHandler, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared "broken image" fallback box. Rendered in place of the real image
 * once it has failed to load, so visitors see a small styled placeholder
 * instead of the browser's native broken-image icon. `fill` mirrors
 * next/image's own prop so the box fills the same relatively-positioned
 * parent the real image would have.
 */
function BrokenImageFallback({
  alt,
  fill,
  width,
  height,
  className,
  decorative,
}: {
  alt?: string;
  fill?: boolean;
  width?: number | `${number}`;
  height?: number | `${number}`;
  className?: string;
  /** Mirrors the real image's own aria-hidden — keeps purely decorative
   * images (hover swaps, blurred backdrops) silent for screen readers even
   * once they've fallen back, instead of announcing "Image unavailable". */
  decorative?: boolean;
}) {
  return (
    <div
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : alt || "Image unavailable"}
      style={fill ? undefined : { width, height }}
      className={cn(
        "flex items-center justify-center bg-muted text-muted-foreground/50",
        fill && "absolute inset-0",
        className
      )}
    >
      <ImageOff className="size-[28%] max-w-8 min-w-3 max-h-8 min-h-3" aria-hidden="true" />
    </div>
  );
}

/**
 * Drop-in replacement for next/image's `<Image>` that swaps in
 * `BrokenImageFallback` — instead of the browser's native broken-image
 * icon — when `src` fails to load. `<Image>` has no built-in fallback story
 * for a bad URL, so anywhere an image comes from dynamic or admin-managed
 * data (product photos, CMS banners/testimonials, category thumbnails,
 * uploaded artwork/proofs) that can go stale or 404 should render through
 * this component instead of importing `next/image` directly.
 */
export function SafeImage({ alt, className, fill, width, height, onError, "aria-hidden": ariaHidden, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <BrokenImageFallback
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        className={className}
        decorative={ariaHidden === true || ariaHidden === "true"}
      />
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={className}
      aria-hidden={ariaHidden}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}

interface SafeImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

/**
 * Same idea as `SafeImage` but for a plain `<img>` tag (e.g. content that
 * can't use next/image's optimizer, like an externally-hosted PDF-proof
 * preview). Renders `BrokenImageFallback` on error — never swaps `src` to
 * another remote asset, so there's nothing to loop on if that failed too.
 */
export function SafeImg({ alt, className, width, height, onError, ...props }: SafeImgProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <BrokenImageFallback
        alt={alt}
        width={width as number | `${number}` | undefined}
        height={height as number | `${number}` | undefined}
        className={className}
      />
    );
  }

  const handleError: ReactEventHandler<HTMLImageElement> = (event) => {
    setFailed(true);
    onError?.(event);
  };

  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={alt} width={width} height={height} className={className} onError={handleError} />;
}
