import Image from "next/image";
import { Quote } from "lucide-react";
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
    <section aria-labelledby="testimonials-heading" className="py-12 lg:py-16 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 id="testimonials-heading" className="font-heading font-bold text-2xl lg:text-3xl">
            Loved by Businesses
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Join thousands of businesses who trust Urgent Printers
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {testimonials.map((t) => (
            <TestimonialCard key={t.id} testimonial={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
