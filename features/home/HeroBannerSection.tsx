"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, A11y } from "swiper/modules";
import type { Swiper as SwiperClass } from "swiper/types";
import { motion } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HeroBanner } from "@/types";

import "swiper/css";

const HeroSparkles = dynamic(() => import("./HeroSparkles").then((m) => m.HeroSparkles), { ssr: false });

interface HeroBannerSectionProps {
  banners: HeroBanner[];
}

interface SparklesRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// Swiper's loop + centeredSlides combination rounds slidesPerView up to an
// odd number (3, for any fractional value >1 we'd use here) and then pads it
// with a loopedSlides buffer of its own, so it silently needs at least 5 real
// slides before loop will initialize at all — below that it disables looping
// outright (and the next-arrow with it). Banners are admin-managed and can be
// as few as 1-2, so pad the rendered slide set by repeating the banner list
// until it clears that floor. Pagination below tracks the *real* banner
// (swiper.realIndex % banners.length), never the padded slide count.
const MIN_LOOP_SLIDES = 5;

function buildLoopSlides(banners: HeroBanner[]): HeroBanner[] {
  if (banners.length <= 1 || banners.length >= MIN_LOOP_SLIDES) return banners;
  const repeatCount = Math.ceil(MIN_LOOP_SLIDES / banners.length);
  return Array.from({ length: repeatCount }, () => banners).flat();
}

export function HeroBannerSection({ banners }: HeroBannerSectionProps) {
  const [showSparkles, setShowSparkles] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sparklesRect, setSparklesRect] = useState<SparklesRect | null>(null);
  const swiperRef = useRef<SwiperClass | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const slides = buildLoopSlides(banners);

  // Sparkles must be clipped to the active slide's photo, not the whole
  // section — the section also spans the peek-slide gutters and the
  // page-background padding around the carousel, which aren't photo content.
  const updateSparklesRect = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    const activePhoto = section.querySelector<HTMLElement>(".swiper-slide-active .hero-slide-photo");
    if (!activePhoto) return;
    const photoRect = activePhoto.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    setSparklesRect({
      top: photoRect.top - sectionRect.top,
      left: photoRect.left - sectionRect.left,
      width: photoRect.width,
      height: photoRect.height,
    });
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (prefersReducedMotion || !isDesktop) return;

    const timer = window.setTimeout(() => {
      updateSparklesRect();
      setShowSparkles(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [updateSparklesRect]);

  useEffect(() => {
    if (!showSparkles) return;
    const section = sectionRef.current;
    if (!section) return;

    updateSparklesRect();
    const observer = new ResizeObserver(() => updateSparklesRect());
    observer.observe(section);
    window.addEventListener("resize", updateSparklesRect);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSparklesRect);
    };
  }, [showSparkles, updateSparklesRect]);

  return (
    <section ref={sectionRef} aria-label="Featured promotions" className="relative w-full pt-4 sm:pt-6 lg:pt-8">
      <Swiper
        modules={[Autoplay, A11y]}
        autoplay={{ delay: 5500, disableOnInteraction: false, pauseOnMouseEnter: true }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={(swiper) => {
          if (banners.length > 0) setActiveIndex(swiper.realIndex % banners.length);
          updateSparklesRect();
        }}
        loop={banners.length > 1}
        centeredSlides
        slidesPerView={1.15}
        spaceBetween={12}
        breakpoints={{
          640: { slidesPerView: 1.2, spaceBetween: 16 },
          1024: { slidesPerView: 1.22, spaceBetween: 20 },
        }}
        className="hero-banner-swiper w-full !pb-9"
      >
        {slides.map((banner, i) => (
          <SwiperSlide key={`${banner.id}-${i}`}>
            <div className="hero-slide-photo relative w-full aspect-[4/3] sm:aspect-video lg:aspect-[9/4] max-h-[720px] rounded-xl overflow-hidden brightness-60 transition-[filter] duration-300 ease-out [.swiper-slide-active_&]:brightness-100">
              <Image
                src={banner.imageUrl}
                alt={banner.headline}
                fill
                priority
                loading="eager"
                className="object-cover"
                sizes="(min-width: 1024px) 82vw, (min-width: 640px) 83vw, 87vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute inset-0 z-10 flex items-end pb-6 sm:pb-8 lg:pb-10">
                <div className="w-full px-5 sm:px-8 lg:px-10">
                  <div className="max-w-xl">
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="font-sans font-black uppercase text-white text-3xl sm:text-4xl lg:text-6xl leading-[0.95] tracking-tight mb-3 lg:mb-4 line-clamp-2"
                    >
                      {banner.headline}
                    </motion.h1>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <Link
                        href={banner.ctaHref}
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          "shrink-0 h-9 px-4 gap-1.5 text-sm rounded-full bg-white hover:bg-white/90 text-neutral-900 font-semibold"
                        )}
                      >
                        {banner.ctaText}
                      </Link>
                      <p className="text-white/85 text-xs sm:text-sm leading-snug line-clamp-1">
                        {banner.subheading}
                      </p>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {banners.length > 1 && (
        <nav
          aria-label="Slide navigation"
          className="absolute left-1/2 -translate-x-1/2 bottom-3 z-20 flex items-center gap-1.5"
        >
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === activeIndex}
              onClick={() => swiperRef.current?.slideToLoop(i)}
              className={cn(
                "h-[7px] rounded-full transition-[width,background-color] duration-300",
                i === activeIndex ? "w-6 bg-primary" : "w-[7px] bg-primary/40 hover:bg-primary/70"
              )}
            />
          ))}
        </nav>
      )}

      {showSparkles && sparklesRect && (
        <div
          className="absolute z-[1] overflow-hidden rounded-xl pointer-events-none"
          style={{
            top: sparklesRect.top,
            left: sparklesRect.left,
            width: sparklesRect.width,
            height: sparklesRect.height,
          }}
        >
          <HeroSparkles />
        </div>
      )}
    </section>
  );
}
