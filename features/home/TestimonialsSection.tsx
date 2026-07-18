import { Quote } from "lucide-react";
import { SectionHeading } from "@/components/common/SectionHeading";
import { StarRating } from "@/components/common/StarRating";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Testimonial } from "@/types";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
        <Avatar className="size-9">
          {testimonial.avatarUrl && (
            <AvatarImage src={testimonial.avatarUrl} alt={testimonial.authorName} />
          )}
          <AvatarFallback className="bg-primary font-heading font-semibold text-primary-foreground">
            {getInitials(testimonial.authorName)}
          </AvatarFallback>
        </Avatar>
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
