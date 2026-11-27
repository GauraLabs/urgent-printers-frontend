"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SafeImage } from "@/components/common/SafeImage";
import { cn } from "@/lib/utils";
import type { HeroBanner } from "@/types";

interface HeroBannerSectionProps {
  banners: HeroBanner[];
}

export function HeroBannerSection({ banners }: HeroBannerSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const goToSlide = useCallback((index: number) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    // The track's symmetric CSS gutters center the first and last slides too.
    const first = track.children[0] as HTMLElement;
    track.scrollTo({
      left: slide.offsetLeft - first.offsetLeft,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (banners.length < 2 || paused || interacting || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) goToSlide((activeIndex + 1) % banners.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [activeIndex, banners.length, goToSlide, interacting, paused, reducedMotion]);

  if (banners.length === 0) return null;

  return (
    <section
      aria-label="Featured promotions"
      aria-roledescription="carousel"
      className="relative w-full pt-4 sm:pt-6 lg:pt-8"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting(false);
      }}
    >
      <h1 className="sr-only">Urgent Printers — Wedding Cards, Invitations &amp; Celebration Printing</h1>
      {/* Native scrolling has identical geometry before and after hydration.
          No loop cloning, width measurement, or JS-dependent initial position. */}
      <div
        ref={trackRef}
        className="hero-banner-track"
        onPointerDown={() => setPaused(true)}
        onScroll={(event) => {
          const track = event.currentTarget;
          const first = track.children[0] as HTMLElement | undefined;
          const second = track.children[1] as HTMLElement | undefined;
          if (!first || !second) return;
          const step = second.offsetLeft - first.offsetLeft;
          if (step > 0) setActiveIndex(Math.min(banners.length - 1, Math.max(0, Math.round(track.scrollLeft / step))));
        }}
      >
        {banners.map((banner, i) => (
          <div key={banner.id} className="hero-banner-slide" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${banners.length}`}>
            <div className={cn(
              "hero-slide-photo relative w-full aspect-[4/3] sm:aspect-video lg:aspect-[9/4] max-h-[720px] rounded-xl overflow-hidden transition-[filter] duration-300 motion-reduce:transition-none",
              i === activeIndex ? "brightness-100" : "brightness-60"
            )}>
              <SafeImage
                src={banner.imageUrl}
                alt={banner.headline}
                fill
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "low"}
                className="object-cover"
                sizes="(min-width: 1024px) 82vw, (min-width: 640px) 83vw, 87vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute inset-0 z-10 flex items-end pb-6 sm:pb-8 lg:pb-10">
                <div className="w-full px-5 sm:px-8 lg:px-10">
                  <div className="max-w-xl">
                    <h2 className="font-sans font-black uppercase text-white text-3xl sm:text-4xl lg:text-6xl leading-[0.95] tracking-tight mb-3 lg:mb-4 line-clamp-2">
                      {banner.headline}
                    </h2>
                    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <p className="order-first sm:order-last text-white/95 text-sm leading-snug line-clamp-2 sm:line-clamp-1">
                        {banner.subheading}
                      </p>
                      <Link href={banner.ctaHref} tabIndex={i === activeIndex ? 0 : -1} className={cn(
                        buttonVariants({ size: "sm" }),
                        "shrink-0 min-h-11 px-4 gap-1.5 text-sm rounded-full bg-white text-neutral-900 font-semibold [a]:hover:bg-primary [a]:hover:text-white"
                      )}>
                        {banner.ctaText}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {banners.length > 1 && (
        <nav aria-label="Slide navigation" className="flex h-12 items-center justify-center">
          {banners.map((banner, i) => (
            <button key={banner.id} type="button" aria-label={`Go to slide ${i + 1}`} aria-current={i === activeIndex ? "true" : undefined}
              onClick={() => { setPaused(true); goToSlide(i); }}
              className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <span aria-hidden="true" className={cn("h-2 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none", i === activeIndex ? "w-6 bg-primary" : "w-2 bg-primary/50")} />
            </button>
          ))}
          <button type="button" disabled={reducedMotion} aria-label={paused ? "Play slideshow" : "Pause slideshow"} onClick={() => setPaused((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-primary disabled:invisible focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </button>
        </nav>
      )}
    </section>
  );
}
