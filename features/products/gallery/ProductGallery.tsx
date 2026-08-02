"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Play, Pause } from "lucide-react";
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
  videoUrl?: string | null;
  videoThumbnailUrl?: string | null;
}

type GallerySlide =
  | { type: "image"; src: string }
  | { type: "video"; src: string; poster?: string };

interface GalleryVideoSlideProps {
  src: string;
  poster?: string;
  productName: string;
}

function GalleryVideoSlide({ src, poster, productName }: GalleryVideoSlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  return (
    <button
      type="button"
      onClick={togglePlay}
      className="relative block h-full w-full"
      aria-label={isPlaying ? `Pause ${productName} video` : `Play ${productName} video`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        className="h-full w-full object-cover"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity",
          isPlaying && "opacity-0"
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white">
          {isPlaying ? (
            <Pause size={24} className="fill-white" />
          ) : (
            <Play size={24} className="fill-white ml-0.5" />
          )}
        </span>
      </span>
    </button>
  );
}

export function ProductGallery({ images, productName, videoUrl, videoThumbnailUrl }: ProductGalleryProps) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Video slide leads the gallery — it's the highest-intent asset when present.
  const slides: GallerySlide[] = videoUrl
    ? [{ type: "video", src: videoUrl, poster: videoThumbnailUrl ?? undefined }, ...images.map((src): GallerySlide => ({ type: "image", src }))]
    : images.map((src): GallerySlide => ({ type: "image", src }));

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
            {slides.map((slide, i) =>
              slide.type === "video" ? (
                <SwiperSlide key={`video-${i}`} className="relative">
                  <GalleryVideoSlide src={slide.src} poster={slide.poster} productName={productName} />
                </SwiperSlide>
              ) : (
                <SwiperSlide key={`img-${i}`} className="relative">
                  <Image
                    src={slide.src}
                    alt={`${productName} — view ${i + 1}`}
                    fill
                    className="object-cover"
                    priority={i === 0}
                    loading={i === 0 ? "eager" : "lazy"}
                    sizes="100vw"
                  />
                </SwiperSlide>
              )
            )}
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
            {slides.map((slide, i) =>
              slide.type === "video" ? (
                <SwiperSlide key={`video-${i}`} className="relative">
                  <GalleryVideoSlide src={slide.src} poster={slide.poster} productName={productName} />
                </SwiperSlide>
              ) : (
                <SwiperSlide key={`img-${i}`} className="relative">
                  <Image
                    src={slide.src}
                    alt={`${productName} — view ${i + 1}`}
                    fill
                    className="object-cover"
                    priority={i === 0}
                    loading={i === 0 ? "eager" : "lazy"}
                    sizes="(max-width: 1024px) 60vw, 500px"
                  />
                </SwiperSlide>
              )
            )}
          </Swiper>
        </div>
      </div>

      {/* Thumbnail strip — desktop only */}
      {slides.length > 1 && (
        <div className="hidden md:block">
          <Swiper
            modules={[Thumbs]}
            onSwiper={setThumbsSwiper}
            slidesPerView={Math.min(slides.length, 4)}
            spaceBetween={8}
            watchSlidesProgress
            className="w-full"
          >
            {slides.map((slide, i) => (
              <SwiperSlide key={slide.type === "video" ? `video-thumb-${i}` : `img-thumb-${i}`}>
                <button
                  aria-label={slide.type === "video" ? `Play video` : `View image ${i + 1}`}
                  className={cn(
                    "relative w-full aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all",
                    activeIndex === i
                      ? "border-primary"
                      : "border-transparent hover:border-muted-foreground/30"
                  )}
                >
                  {slide.type === "video" ? (
                    slide.poster ? (
                      <Image
                        src={slide.poster}
                        alt={`${productName} video thumbnail`}
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                    ) : (
                      <div className="h-full w-full bg-muted" />
                    )
                  ) : (
                    <Image
                      src={slide.src}
                      alt={`${productName} thumbnail ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="120px"
                    />
                  )}
                  {slide.type === "video" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <Play size={18} className="fill-white text-white" />
                    </span>
                  )}
                </button>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}
    </div>
  );
}
