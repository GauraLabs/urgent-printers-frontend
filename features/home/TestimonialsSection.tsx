import Image from "next/image";
import { Quote } from "lucide-react";
import { SectionHeading } from "@/components/common/SectionHeading";
import { StarRating } from "@/components/common/StarRating";
import type { Testimonial } from "@/types";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <article className="flex flex-col gap-4 p-6 rounded-2xl bg-card border border-border">
      <Quote size={20} className="text-primary/30 shrink-0" />
      <p className="text-sm leading-relaxed text-foreground/90 flex-1">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <StarRating rating={testimonial.rating} size="sm" />
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-muted shrink-0">
          <Image
            src={testimonial.avatarUrl}
            alt={testimonial.authorName}
            fill
            className="object-cover"
            sizes="36px"
          />
        </div>
        <div>
          <p className="font-heading font-semibold text-xs">{testimonial.authorName}</p>
          <p className="text-muted-foreground text-xs">{testimonial.company}</p>
        </div>
      </div>
    </article>
  );
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  return (
    <section aria-labelledby="testimonials-heading" className="relative overflow-hidden py-12 lg:py-16 bg-secondary/30">
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-brand-orange/10 blur-3xl -z-10" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="testimonials-heading"
          eyebrow="Testimonials"
          title="Loved by Businesses"
          description="Join thousands of businesses who trust Urgent Printers"
          align="center"
          className="mb-10"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {testimonials.map((t) => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
