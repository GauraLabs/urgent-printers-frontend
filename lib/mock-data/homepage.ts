import type { HeroBanner, Testimonial } from "@/types";

export const mockHeroBanners: HeroBanner[] = [
  {
    id: "hero-1",
    headline: "Print That Makes an Impression",
    subheading: "Premium business cards, flyers, banners, and packaging — delivered fast. Quality that speaks before you do.",
    ctaText: "Shop All Products",
    ctaHref: "/products",
    imageUrl: "https://picsum.photos/seed/hero1/1600/900",
    badgeText: "Free delivery on orders over ₹999",
  },
  {
    id: "hero-2",
    headline: "Your Brand Deserves Better Packaging",
    subheading: "Custom packaging that turns every delivery into an experience. Make your unboxing unforgettable.",
    ctaText: "Explore Packaging",
    ctaHref: "/products/packaging",
    imageUrl: "https://picsum.photos/seed/hero2/1600/900",
    badgeText: "From 25 units · Pan-India delivery",
  },
];

export const mockTestimonials: Testimonial[] = [
  {
    id: "test-1",
    authorName: "Vasu ji",
    company: "Bloom Collective, Mumbai",
    avatarUrl: "https://picsum.photos/seed/test1/100/100",
    rating: 5,
    quote: "Urgent Printers transformed our brand. Our packaging now generates Instagram posts from customers without us even asking. The quality is simply outstanding.",
  },
  {
    id: "test-2",
    authorName: "Chaitanya Sharma",
    company: "Verma & Associates, Delhi",
    avatarUrl: "https://picsum.photos/seed/test2/100/100",
    rating: 5,
    quote: "We rely on Urgent Printers for all our client presentation materials. Turnaround is consistently fast and the print quality is second to none.",
  },
  {
    id: "test-3",
    authorName: "Vanya Sharma",
    company: "Spice Route Café, Bengaluru",
    avatarUrl: "https://picsum.photos/seed/test3/100/100",
    rating: 5,
    quote: "I've used five different printers over the years. Urgent Printers is the only one I've stayed with. Reliable, affordable, and genuinely excellent quality.",
  },
  {
    id: "test-4",
    authorName: "Kunal Kaushik",
    company: "IronCore Fitness, Pune",
    avatarUrl: "https://picsum.photos/seed/test4/100/100",
    rating: 5,
    quote: "Our branded merch from Urgent Printers sells out at every event. Members love the quality and the prints don't fade after washing — unlike other suppliers we've tried.",
  },
];
