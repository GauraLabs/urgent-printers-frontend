import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimateIn } from "@/components/common/AnimateIn";

interface CampaignBannerProps {
  imageUrl: string;
  headline: string;
  subheading?: string;
  ctaText: string;
  ctaHref: string;
}

export function CampaignBanner({ imageUrl, headline, subheading, ctaText, ctaHref }: CampaignBannerProps) {
  return (
    <section aria-label="Featured campaign" className="relative w-full overflow-hidden">
      <div className="relative w-full h-[380px] sm:h-[440px] lg:h-[520px]">
        <Image
          src={imageUrl}
          alt={headline}
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent sm:bg-gradient-to-r sm:from-black/80 sm:via-black/45 sm:to-transparent" />
        <div className="absolute inset-0 flex items-end sm:items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <AnimateIn className="max-w-lg pb-8 sm:pb-0">
              <div className="rounded-2xl bg-black/30 backdrop-blur-sm px-5 py-5 sm:px-7 sm:py-7">
                <h2 className="font-heading font-bold text-white text-3xl sm:text-4xl lg:text-5xl leading-tight mb-3">
                  {headline}
                </h2>
                {subheading && (
                  <p className="text-white/90 text-sm sm:text-base mb-6 leading-relaxed">
                    {subheading}
                  </p>
                )}
                <Link
                  href={ctaHref}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/80 px-6 py-2.5 text-white text-base font-semibold hover:bg-white/10 hover:border-white transition-all duration-300"
                >
                  {ctaText}
                  <ArrowRight size={18} />
                </Link>
              </div>
            </AnimateIn>
          </div>
        </div>
      </div>
    </section>
  );
}
