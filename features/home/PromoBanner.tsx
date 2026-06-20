import Link from "next/link";
import { ArrowRight, Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

export function PromoBanner() {
  return (
    <section aria-label="Promotion" className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="relative overflow-hidden rounded-3xl bg-primary px-6 sm:px-8 py-12 lg:py-16 text-center"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-brand-orange/20 blur-2xl" />
          <div className="absolute top-8 right-12 w-20 h-20 rounded-full bg-brand-orange/20" />

          {/* Decorative icon */}
          <Printer
            size={220}
            strokeWidth={1}
            className="hidden lg:block absolute -right-10 top-1/2 -translate-y-1/2 text-white/10"
            aria-hidden="true"
          />

          <div className="relative max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-medium">
              <Printer size={13} />
              New customer offer
            </div>
            <h2 className="font-heading font-bold text-white text-2xl lg:text-4xl mb-3">
              10% Off Your First Order
            </h2>
            <p className="text-white/80 text-sm lg:text-base mb-8">
              Use code <span className="font-bold text-white bg-white/15 px-2 py-0.5 rounded">FIRST10</span> at checkout.
              Valid across India, any order, any quantity.
            </p>
            <Link
              href={ROUTES.products}
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground font-semibold gap-2"
              )}
            >
              Start Designing <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
