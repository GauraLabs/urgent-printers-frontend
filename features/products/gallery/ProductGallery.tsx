"use client";

import { useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Thumbs, A11y } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { cn } from "@/lib/utils";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative rounded-2xl overflow-hidden bg-muted aspect-[4/3]">
        {/* Mobile: Swiper with touch */}
        <div className="block md:hidden h-full">
          <Swiper
            modules={[Pagination, A11y]}
            pagination={{ clickable: true }}
            onSlideChange={(s) => setActiveIndex(s.activeIndex)}
            className="h-full"
          >
            {images.map((src, i) => (
              <SwiperSlide key={i} className="relative">
                <Image
                  src={src}
                  alt={`${productName} — view ${i + 1}`}
                  fill
                  className="object-cover"
                  priority={i === 0}
                  loading={i === 0 ? "eager" : "lazy"}
                  sizes="100vw"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Desktop: thumbnail-controlled */}
        <div className="hidden md:block relative h-full">
          <Swiper
            modules={[Navigation, Thumbs, A11y]}
            thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
            onSlideChange={(s) => setActiveIndex(s.activeIndex)}
            className="h-full"
          >
            {images.map((src, i) => (
              <SwiperSlide key={i} className="relative">
                <Image
                  src={src}
                  alt={`${productName} — view ${i + 1}`}
                  fill
                  className="object-cover"
                  priority={i === 0}
                  loading={i === 0 ? "eager" : "lazy"}
                  sizes="(max-width: 1024px) 60vw, 500px"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      {/* Thumbnail strip — desktop only */}
      {images.length > 1 && (
        <div className="hidden md:block">
          <Swiper
            modules={[Thumbs]}
            onSwiper={setThumbsSwiper}
            slidesPerView={Math.min(images.length, 4)}
            spaceBetween={8}
            watchSlidesProgress
            className="w-full"
          >
            {images.map((src, i) => (
              <SwiperSlide key={i}>
                <button
                  aria-label={`View image ${i + 1}`}
                  className={cn(
                    "relative w-full aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all",
                    activeIndex === i
                      ? "border-primary"
                      : "border-transparent hover:border-muted-foreground/30"
                  )}
                >
                  <Image
                    src={src}
                    alt={`${productName} thumbnail ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </button>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}
    </div>
  );
}
