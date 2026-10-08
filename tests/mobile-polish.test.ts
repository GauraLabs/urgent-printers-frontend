import { describe, expect, it } from "vitest";
import { getBottomInset, isBottomNavHidden } from "@/features/navigation/bottomNav";
import { showsMobileSearchBar } from "@/components/layout/MobileSearchBar";
import { formatCardPrice, formatPrice } from "@/lib/utils";

describe("formatCardPrice", () => {
  it("drops .00 for whole rupees and keeps paise otherwise", () => {
    expect(formatCardPrice(800)).toBe("₹800");
    expect(formatCardPrice(1200)).toBe("₹1,200");
    expect(formatCardPrice(1234567)).toBe("₹12,34,567");
    expect(formatCardPrice(6.5)).toBe("₹6.50");
    expect(formatCardPrice(23.17)).toBe("₹23.17");
  });
  it("leaves the shared formatter (cart, checkout, invoices) untouched", () => {
    expect(formatPrice(800)).toBe("₹800.00");
  });
});

describe("bottom nav visibility by route", () => {
  it("hides on the PDP, cart and checkout", () => {
    for (const p of ["/products/wedding/red-card", "/cart", "/checkout", "/checkout/confirmation/42"]) {
      expect(isBottomNavHidden(p)).toBe(true);
    }
  });
  it("shows everywhere else, including listings", () => {
    for (const p of ["/", "/products", "/products/wedding", "/search", "/account/orders", "/faq"]) {
      expect(isBottomNavHidden(p)).toBe(false);
    }
  });
  it("reserves the right bottom inset", () => {
    expect(getBottomInset("/")).toBe("nav");
    expect(getBottomInset("/products/a/b")).toBe("sticky");
    expect(getBottomInset("/cart")).toBe("none");
    expect(getBottomInset("/checkout")).toBe("none");
  });
});

describe("mobile search bar routes", () => {
  it("shows on home and listings only", () => {
    expect(showsMobileSearchBar("/")).toBe(true);
    expect(showsMobileSearchBar("/products")).toBe(true);
    expect(showsMobileSearchBar("/products/wedding")).toBe(true);
    expect(showsMobileSearchBar("/products/wedding/red-card")).toBe(false);
    expect(showsMobileSearchBar("/search")).toBe(false);
    expect(showsMobileSearchBar("/cart")).toBe(false);
  });
});
