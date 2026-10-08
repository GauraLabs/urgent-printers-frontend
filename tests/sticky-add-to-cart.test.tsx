import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
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
    const price = within(screen.getByTestId("sticky-desktop")).getByText("₹900.00");
    expect(price.tagName).toBe("P");
    expect(price.className).toBe("text-xs text-muted-foreground");
    expect(screen.queryByText(/Save/)).toBeNull();
  });

  it("shows struck MRP total and savings when discounted", () => {
    show({ mrpTotal: 1200, savings: 300 });
    const desktop = within(screen.getByTestId("sticky-desktop"));
    expect(desktop.getByText("₹1,200.00").className).toContain("line-through");
    expect(desktop.getByText("₹900.00")).toBeInTheDocument();
    expect(desktop.getByText(/Save ₹300\.00/)).toBeInTheDocument();
  });

  it("mobile bar drops the name and shows total, quantity and a short saving", () => {
    show({ quantityLabel: "50 pcs", mrpTotal: 1200, savings: 300 });
    const mobile = within(screen.getByTestId("sticky-mobile"));
    expect(mobile.queryByText("Cards")).toBeNull();
    expect(mobile.getByText(/₹900\.00/)).toBeInTheDocument();
    expect(mobile.getByText(/50 pcs/)).toBeInTheDocument();
    expect(mobile.getByText("Save ₹300")).toBeInTheDocument();
  });
});
