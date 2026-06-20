"use client";

import { useState } from "react";
import type { Metadata } from "next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Mail, MapPin, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/common/FormField";
import { cn } from "@/lib/utils";

const schema = z.object({
  name:    z.string().min(2, "Name required"),
  email:   z.string().email("Valid email required"),
  phone:   z.string().optional(),
  subject: z.string().min(5, "Subject required"),
  message: z.string().min(20, "Please write at least 20 characters"),
});
type FormValues = z.infer<typeof schema>;

const CONTACT_INFO = [
  { icon: Phone,  label: "Toll Free",   value: "1800-123-4567",               sub: "Mon – Sat, 9 AM – 6 PM IST" },
  { icon: Mail,   label: "Email",       value: "hello@urgentprinters.in",      sub: "We reply within 4 business hours" },
  { icon: MapPin, label: "Address",     value: "Mumbai, Maharashtra, India",   sub: "Head office" },
  { icon: Clock,  label: "Order Support",value: "support@urgentprinters.in",  sub: "For order queries and artwork help" },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(_data: FormValues) {
    // REAL API: POST /api/contact with form data
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    toast.success("Message sent! We'll get back to you shortly.");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl lg:text-3xl">Contact Us</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Have a question about an order, artwork, or just want to say hello? We&apos;re here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact info */}
        <div className="space-y-6">
          {CONTACT_INFO.map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-sm text-foreground mt-0.5">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-border bg-secondary/30 p-5 mt-6 shadow-sm">
            <p className="font-heading font-semibold text-sm mb-2">Common Questions</p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>→ <a href="/policies/artwork-guidelines" className="hover:text-primary transition-colors">Artwork file requirements</a></li>
              <li>→ <a href="/policies/shipping" className="hover:text-primary transition-colors">Delivery timelines and tracking</a></li>
              <li>→ <a href="/policies/returns" className="hover:text-primary transition-colors">Returns and quality claims</a></li>
            </ul>
          </div>
        </div>

        {/* Contact form */}
        {submitted ? (
          <div className="flex flex-col items-center justify-center text-center gap-4 rounded-2xl border border-success/30 bg-success/5 p-12">
            <CheckCircle2 size={40} className="text-success" />
            <div>
              <p className="font-heading font-bold text-lg">Message Received!</p>
              <p className="text-muted-foreground text-sm mt-1">We&apos;ll get back to you within 4 business hours.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Your name" required error={errors.name?.message} {...register("name")} />
              <FormField label="Email" type="email" required error={errors.email?.message} {...register("email")} />
            </div>
            <FormField label="Phone" type="tel" placeholder="9876543210 (optional)" error={errors.phone?.message} {...register("phone")} />
            <FormField label="Subject" placeholder="e.g. Question about my order" required error={errors.subject?.message} {...register("subject")} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Message <span className="text-destructive">*</span></label>
              <textarea
                {...register("message")}
                rows={5}
                placeholder="Tell us how we can help…"
                className={cn(
                  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors",
                  errors.message && "border-destructive"
                )}
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
                "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
                "disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              )}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Send Message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
