"use client";

import { Quote } from "lucide-react";
import { motion } from "motion/react";
import { SectionHeading } from "@/components/common/SectionHeading";
import { StarRating } from "@/components/common/StarRating";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
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

function TestimonialCard({
  testimonial,
  delay,
  prefersReducedMotion,
}: {
  testimonial: Testimonial;
  delay: number;
  prefersReducedMotion: boolean;
}) {
  return (
    <motion.article
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay }}
      className="flex flex-col gap-4 p-6 max-md:p-4 max-md:w-[80%] max-md:shrink-0 max-md:snap-start rounded-2xl bg-card border border-border"
    >
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
    </motion.article>
  );
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section aria-labelledby="testimonials-heading" className="relative overflow-hidden py-6 md:py-12 lg:py-16 bg-secondary/60">
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-brand-orange/10 blur-3xl -z-10" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <SectionHeading
            id="testimonials-heading"
            eyebrow="Testimonials"
            title="Loved by Our Customers"
            description="Families and hosts across India trust Urgent Printers for their celebrations"
            align="center"
            className="mb-3 md:mb-10"
          />
        </motion.div>

        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-3 -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-4 lg:gap-6 md:overflow-visible">
          {testimonials.map((t, i) => (
            <TestimonialCard
              key={t.id}
              testimonial={t}
              delay={i * 0.1}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
