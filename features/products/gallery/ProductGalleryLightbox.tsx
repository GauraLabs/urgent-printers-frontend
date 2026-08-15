"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, XIcon } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Zoom, Pagination, A11y } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Dialog, DialogPortal, DialogOverlay, DialogClose } from "@/components/ui/dialog";
import { useSwiperArrowNav } from "./useSwiperArrowNav";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/zoom";

interface ProductGalleryLightboxProps {
  images: string[];
  productName: string;
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProductGalleryLightbox({
  images,
  productName,
  initialIndex,
  open,
  onOpenChange,
}: ProductGalleryLightboxProps) {
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const hasMultipleImages = images.length > 1;

  const { goToSlide, handleKeyDown } = useSwiperArrowNav(swiperInstance, activeIndex, images.length);

  // Re-sync to whatever slide was active in the main gallery every time the
  // lightbox opens — the Swiper instance stays mounted between opens, so its
  // own `initialSlide` prop only applies once.
  useEffect(() => {
    if (!open || !swiperInstance || swiperInstance.destroyed) return;
    // slideTo triggers Swiper's own onSlideChange (wired to setActiveIndex below)
    // when it actually moves; if the index is already correct it's a no-op.
    swiperInstance.slideTo(initialIndex, 0);
  }, [open, initialIndex, swiperInstance]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[60] bg-black/95" />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed inset-0 z-[60] flex flex-col outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          onKeyDown={handleKeyDown}
          aria-label={`${productName} image, full screen`}
        >
          <DialogClose
            aria-label="Close full-screen view"
            className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
          >
            <XIcon size={20} />
          </DialogClose>

          <Swiper
            modules={[Zoom, Pagination, A11y]}
            zoom={{ maxRatio: 4 }}
            pagination={hasMultipleImages ? { clickable: true } : false}
            initialSlide={initialIndex}
            onSwiper={setSwiperInstance}
            onSlideChange={(s) => setActiveIndex(s.activeIndex)}
            className="h-full w-full"
          >
            {images.map((src, i) => (
              <SwiperSlide key={i} className="flex h-full w-full items-center justify-center">
                <div className="swiper-zoom-container relative h-full w-full">
                  <Image
                    src={src}
                    alt={`${productName} — view ${i + 1}, zoomed`}
                    fill
                    className="object-contain"
                    sizes="100vw"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={() => goToSlide(-1)}
                aria-label="Previous image"
                className="hidden md:flex absolute left-4 top-1/2 z-10 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 hover:scale-110 transition-all"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={() => goToSlide(1)}
                aria-label="Next image"
                className="hidden md:flex absolute right-4 top-1/2 z-10 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 hover:scale-110 transition-all"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
