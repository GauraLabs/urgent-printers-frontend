import type { KeyboardEvent } from "react";
import type { Swiper as SwiperType } from "swiper";

// Shared left/right arrow-key + prev/next-button navigation for a controlled
// Swiper instance. Used by both the desktop main gallery and the lightbox so
// the two stay in lockstep instead of drifting apart.
export function useSwiperArrowNav(
  swiperInstance: SwiperType | null,
  activeIndex: number,
  slideCount: number
) {
  function goToSlide(delta: 1 | -1) {
    if (slideCount < 2 || !swiperInstance || swiperInstance.destroyed) return;
    const nextIndex = (activeIndex + delta + slideCount) % slideCount;
    swiperInstance.slideTo(nextIndex);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToSlide(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToSlide(1);
    }
  }

  return { goToSlide, handleKeyDown };
}
