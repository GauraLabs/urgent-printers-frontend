import Image from "next/image";
import type { Category } from "@/types";
import { CategoryVideoOverlay } from "./CategoryVideoOverlay";

interface CategoryHeroProps {
  category: Category;
}

// Server Component: renders the poster/banner image synchronously (SSR, eager —
// this is the LCP candidate) and hands the client-only autoplay video, if any,
// to CategoryVideoOverlay. Renders nothing when neither video nor banner is set,
// leaving the plain header strip below untouched.
export function CategoryHero({ category }: CategoryHeroProps) {
  const { videoUrl, videoThumbnailUrl, bannerUrl, name } = category;
  const posterSrc = videoUrl ? videoThumbnailUrl : bannerUrl;
  if (!posterSrc) return null;

  return (
    <div className="relative w-full h-[180px] sm:h-[240px] lg:h-[320px] overflow-hidden bg-muted">
      <Image
        src={posterSrc}
        alt={name}
        fill
        priority
        loading="eager"
        className="object-cover"
        sizes="100vw"
      />
      {videoUrl && <CategoryVideoOverlay videoUrl={videoUrl} poster={videoThumbnailUrl ?? undefined} />}
      <div className="absolute inset-0 bg-black/25" />
    </div>
  );
}
