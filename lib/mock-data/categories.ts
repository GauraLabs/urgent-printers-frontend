import type { Category } from "@/types";

export const mockCategories: Category[] = [
  {
    id: "cat-1",
    slug: "business-cards",
    name: "Business Cards",
    description: "Make a lasting first impression with premium business cards.",
    imageUrl: "https://picsum.photos/seed/bizcard/600/400",
    productCount: 3,
  },
  {
    id: "cat-2",
    slug: "flyers",
    name: "Flyers",
    description: "Eye-catching flyers for promotions, events, and announcements.",
    imageUrl: "https://picsum.photos/seed/flyers/600/400",
    productCount: 3,
  },
  {
    id: "cat-3",
    slug: "banners",
    name: "Banners",
    description: "Large-format banners for trade shows, storefronts, and events.",
    imageUrl: "https://picsum.photos/seed/banners/600/400",
    productCount: 3,
  },
  {
    id: "cat-4",
    slug: "packaging",
    name: "Packaging",
    description: "Custom packaging that elevates your brand and protects products.",
    imageUrl: "https://picsum.photos/seed/packaging/600/400",
    productCount: 3,
  },
  {
    id: "cat-5",
    slug: "brochures",
    name: "Brochures",
    description: "Professional brochures for detailed marketing and information.",
    imageUrl: "https://picsum.photos/seed/brochures/600/400",
    productCount: 3,
  },
  {
    id: "cat-6",
    slug: "custom-merch",
    name: "Custom Merch",
    description: "Branded merchandise that keeps your business top of mind.",
    imageUrl: "https://picsum.photos/seed/merch/600/400",
    productCount: 3,
  },
];
