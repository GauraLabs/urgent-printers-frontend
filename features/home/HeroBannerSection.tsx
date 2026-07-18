"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Star } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, A11y } from "swiper/modules";
import { motion } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
            <div className="relative w-full h-[340px] sm:h-[420px] lg:h-[520px]">
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
                        className="inline-block mb-3 px-3 py-1 rounded-full bg-brand-orange text-brand-orange-foreground text-xs font-semibold tracking-wide"
                      >
                        {banner.badgeText}
                      </motion.span>
                    )}
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="font-heading font-bold text-white text-2xl sm:text-3xl lg:text-5xl leading-tight mb-3"
                    >
                      {banner.headline}
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.35 }}
                      className="text-white/85 text-sm sm:text-base lg:text-lg mb-6 leading-relaxed"
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
                          "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground font-semibold gap-2"
                        )}
                      >
                        {banner.ctaText}
                        <ArrowRight size={16} />
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

      <div className="hidden sm:block absolute bottom-4 right-4 lg:bottom-6 lg:right-6 z-10">
        <Card className="flex-row items-center gap-3 px-4 py-3 rounded-2xl shadow-lg">
          <div className="flex items-center gap-1 text-brand-orange">
            <Star size={16} className="fill-brand-orange" />
            <span className="font-heading font-bold text-foreground text-base">4.8</span>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-xs text-muted-foreground leading-tight">
            <p className="font-semibold text-foreground">10,000+ orders</p>
            <p>delivered across India</p>
          </div>
        </Card>
      </div>
    </section>
  );
}
