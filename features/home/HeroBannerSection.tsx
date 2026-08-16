"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, A11y } from "swiper/modules";
import { motion } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HeroBanner } from "@/types";

import "swiper/css";
import "swiper/css/pagination";

const HeroSparkles = dynamic(() => import("./HeroSparkles").then((m) => m.HeroSparkles), { ssr: false });

interface HeroBannerSectionProps {
  banners: HeroBanner[];
}

export function HeroBannerSection({ banners }: HeroBannerSectionProps) {
  const [showSparkles, setShowSparkles] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (prefersReducedMotion || !isDesktop) return;

    const timer = window.setTimeout(() => setShowSparkles(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section aria-label="Featured promotions" className="relative w-full overflow-hidden">
      <Swiper
        modules={[Autoplay, Pagination, A11y]}
        autoplay={{ delay: 5500, disableOnInteraction: false, pauseOnMouseEnter: true }}
        pagination={{ clickable: true }}
        loop={banners.length > 1}
        className="w-full"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <div className="relative w-full h-[290px] sm:h-[320px] lg:h-[380px]">
              <Image src={banner.imageUrl} alt={banner.headline} fill priority loading="eager" className="object-cover" sizes="100vw" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/40 to-transparent" />
              <div className="absolute inset-0 z-10 flex items-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                  <div className="max-w-xl">
                    {banner.badgeText && (
                      <motion.span
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="inline-block mb-2 lg:mb-3 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold tracking-wide"
                      >
                        {banner.badgeText}
                      </motion.span>
                    )}
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="font-heading font-bold text-white text-2xl sm:text-3xl lg:text-5xl leading-tight mb-2 lg:mb-4 line-clamp-2"
                    >
                      {banner.headline}
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.35 }}
                      className="text-white/85 text-sm sm:text-base lg:text-lg mb-6 lg:mb-8 leading-relaxed line-clamp-2"
                    >
                      {banner.subheading}
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 }}
                    >
                      <Link
                        href={banner.ctaHref}
                        className={cn(
                          buttonVariants({ size: "lg" }),
                          "h-12 lg:h-14 px-7 lg:px-9 gap-2.5 text-base lg:text-lg bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground font-semibold"
                        )}
                      >
                        {banner.ctaText}
                        <ArrowRight size={18} />
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {showSparkles && (
        <div className="absolute inset-0 z-[1] pointer-events-none">
          <HeroSparkles />
        </div>
      )}
    </section>
  );
}
