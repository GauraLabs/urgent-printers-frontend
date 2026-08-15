"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Play, Pause, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Thumbs, A11y } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { cn } from "@/lib/utils";
import { useSwiperArrowNav } from "./useSwiperArrowNav";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

const ProductGalleryLightbox = dynamic(() => import("./ProductGalleryLightbox"), { ssr: false });

interface ProductGalleryProps {
  images: string[];
  // Index-aligned with `images` — 300x300 thumb crop of each slide, used only by
  // the thumbnail rail below so it doesn't fetch the full lg/1600px slide image
  // at ~120px. Falls back to the slide's own src when absent (mock data).
  imageThumbnails?: string[];
  productName: string;
  videoUrl?: string | null;
  videoThumbnailUrl?: string | null;
}

type GallerySlide =
  | { type: "image"; src: string; thumbSrc: string }
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

export function ProductGallery({ images, imageThumbnails, productName, videoUrl, videoThumbnailUrl }: ProductGalleryProps) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [mainSwiper, setMainSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [hasOpenedLightbox, setHasOpenedLightbox] = useState(false);

  const imageSlides: GallerySlide[] = images.map((src, i) => ({
    type: "image",
    src,
    thumbSrc: imageThumbnails?.[i] ?? src,
  }));

  // Video slide leads the gallery — it's the highest-intent asset when present.
  const slides: GallerySlide[] = videoUrl
    ? [{ type: "video", src: videoUrl, poster: videoThumbnailUrl ?? undefined }, ...imageSlides]
    : imageSlides;

  const hasMultipleSlides = slides.length > 1;

  const { goToSlide, handleKeyDown: handleGalleryKeyDown } = useSwiperArrowNav(
    mainSwiper,
    activeIndex,
    slides.length
  );

  // Lightbox only shows images (not the video slide), so translate a `slides`
  // index into an `images` index — video, when present, always leads at 0.
  const imageIndexOffset = videoUrl ? 1 : 0;

  function openLightbox(slideIndex: number) {
    setLightboxIndex(Math.max(0, slideIndex - imageIndexOffset));
    setHasOpenedLightbox(true);
    setLightboxOpen(true);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative rounded-2xl overflow-hidden bg-muted aspect-square">
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
                  <button
                    type="button"
                    onClick={() => openLightbox(i)}
                    aria-label={`Zoom into ${productName} image ${i + 1}`}
                    className="absolute inset-0 cursor-zoom-in"
                  >
                    <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
                      <ZoomIn size={16} />
                    </span>
                  </button>
                </SwiperSlide>
              )
            )}
          </Swiper>
        </div>

        {/* Desktop: thumbnail-controlled */}
        <div
          className="hidden md:block relative h-full outline-none group"
          tabIndex={hasMultipleSlides ? 0 : undefined}
          role="group"
          aria-label={`${productName} image gallery`}
          onKeyDown={handleGalleryKeyDown}
        >
          <Swiper
            modules={[Navigation, Thumbs, A11y]}
            thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
            onSlideChange={(s) => setActiveIndex(s.activeIndex)}
            onSwiper={setMainSwiper}
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
                  <button
                    type="button"
                    onClick={() => openLightbox(i)}
                    aria-label={`Zoom into ${productName} image ${i + 1}`}
                    className="absolute inset-0 cursor-zoom-in"
                  >
                    <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <ZoomIn size={16} />
                    </span>
                  </button>
                </SwiperSlide>
              )
            )}
          </Swiper>

          {hasMultipleSlides && (
            <>
              <button
                type="button"
                onClick={() => goToSlide(-1)}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 transition-all group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-black/60 hover:scale-110"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => goToSlide(1)}
                aria-label="Next image"
                className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 transition-all group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-black/60 hover:scale-110"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
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
                    "relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all",
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
                      src={slide.thumbSrc}
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

      {hasOpenedLightbox && (
        <ProductGalleryLightbox
          images={images}
          productName={productName}
          initialIndex={lightboxIndex}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      )}
    </div>
  );
}
