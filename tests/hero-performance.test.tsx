import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { HeroBanner } from "@/types";
import { HeroBannerSection } from "@/features/home/HeroBannerSection";

vi.mock("@/components/common/SafeImage", () => ({
  SafeImage: ({ fill: _fill, ...props }: Record<string, unknown>) => <img {...props} />,
}));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));

const banners: HeroBanner[] = [0, 1, 2].map((i) => ({
  id: String(i), imageUrl: `/banner-${i}.webp`, headline: `Promotion ${i + 1}`,
  subheading: "Printed for your celebration", ctaText: `Shop promotion ${i + 1}`, ctaHref: `/products?promotion=${i}`,
}));
let reducedMotion = false;
const scrollTo = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  reducedMotion = false;
  scrollTo.mockClear();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: reducedMotion, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) {
    return Number(this.getAttribute("aria-label")?.match(/^(\d+) of/)?.[1] ?? 1) * 360;
  });
  HTMLElement.prototype.scrollTo = scrollTo;
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("hero loading and navigation", () => {
  it("renders each promotion once and prioritizes only the initial image", () => {
    render(<HeroBannerSection banners={banners} />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(3);
    expect(images[0]).toHaveAttribute("loading", "eager");
    expect(images[0]).toHaveAttribute("fetchpriority", "high");
    for (const image of images.slice(1)) {
      expect(image).toHaveAttribute("loading", "lazy");
      expect(image).toHaveAttribute("fetchpriority", "low");
    }
    expect(screen.getAllByRole("link").filter((link) => link.tabIndex === 0)).toHaveLength(1);
  });

  it("allows navigation and pauses autoplay after an explicit selection", () => {
    render(<HeroBannerSection banners={banners} />);
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 3" }));
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 720, behavior: "smooth" });
    expect(screen.getByRole("button", { name: "Play slideshow" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(12000));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("does not auto-advance while a visitor focuses a promotion", () => {
    render(<HeroBannerSection banners={banners} />);
    fireEvent.focus(screen.getByRole("link", { name: "Shop promotion 1" }));
    act(() => vi.advanceTimersByTime(12000));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("honors reduced motion for autoplay and manual navigation", () => {
    reducedMotion = true;
    render(<HeroBannerSection banners={banners} />);
    act(() => vi.advanceTimersByTime(12000));
    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 2" }));
    expect(scrollTo).toHaveBeenCalledWith({ left: 360, behavior: "instant" });
  });

  it("does not show controls for a single promotion or an empty carousel", () => {
    const { rerender } = render(<HeroBannerSection banners={banners.slice(0, 1)} />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    rerender(<HeroBannerSection banners={[]} />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
