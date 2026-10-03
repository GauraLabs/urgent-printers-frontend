import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { createRef } from "react";
import { StickyAddToCart } from "@/features/products/StickyAddToCart";

type IOCallback = (entries: { isIntersecting: boolean }[]) => void;
let trigger: IOCallback = () => {};

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IOCallback) {
        trigger = cb;
      }
      observe() {}
      disconnect() {}
    }
  );
});

function show(props: Partial<Parameters<typeof StickyAddToCart>[0]>) {
  const ref = createRef<HTMLButtonElement>();
  render(
    <>
      <button ref={ref}>target</button>
      <StickyAddToCart productName="Cards" price="₹900.00" observeRef={ref} onAddToCart={() => {}} {...props} />
    </>
  );
  act(() => trigger([{ isIntersecting: false }]));
}

describe("StickyAddToCart", () => {
  it("renders just the total when there is no discount", () => {
    show({});
    const price = screen.getByText("₹900.00");
    expect(price.tagName).toBe("P");
    expect(price.className).toBe("text-xs text-muted-foreground");
    expect(screen.queryByText(/Save/)).toBeNull();
  });

  it("shows struck MRP total and savings when discounted", () => {
    show({ mrpTotal: 1200, savings: 300 });
    expect(screen.getByText("₹1,200.00").className).toContain("line-through");
    expect(screen.getByText("₹900.00")).toBeInTheDocument();
    expect(screen.getByText(/Save ₹300\.00/)).toBeInTheDocument();
  });
});
