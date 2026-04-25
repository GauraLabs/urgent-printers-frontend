"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/common/FormField";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants/routes";

const schema = z.object({
  title: z.string().min(3, "Please add a short title"),
  body:  z.string().min(20, "Please write at least 20 characters about your experience"),
});
type FormValues = z.infer<typeof schema>;

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            size={28}
            className={cn(
              "transition-colors",
              (hovered || value) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productName = searchParams.get("product") ?? "this product";
  const orderId = searchParams.get("orderId") ?? "";

  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", body: "" },
  });

  async function onSubmit(data: FormValues) {
    if (rating === 0) { toast.error("Please select a rating."); return; }
    // REAL API: POST /api/reviews with { orderId, productId, rating, title, body }
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    toast.success("Review submitted! Thank you.");
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-4 py-16">
        <CheckCircle2 size={48} className="text-success" />
        <div>
          <p className="font-heading font-bold text-xl">Thank You!</p>
          <p className="text-muted-foreground text-sm mt-1">Your review helps other customers make great choices.</p>
        </div>
        <button
          onClick={() => router.push(ROUTES.accountOrder(orderId))}
          className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Back to Order
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl">Leave a Review</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sharing your experience with <span className="font-semibold text-foreground">{productName}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* Star rating */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Overall Rating <span className="text-destructive">*</span></p>
          <StarPicker value={rating} onChange={setRating} />
          <p className="text-xs text-muted-foreground">
            {rating === 1 && "Poor — not what I expected"}
            {rating === 2 && "Below average"}
            {rating === 3 && "Average — meets basic expectations"}
            {rating === 4 && "Good — very happy with the quality"}
            {rating === 5 && "Excellent — absolutely loved it!"}
          </p>
        </div>

        <FormField
          label="Review title"
          placeholder="e.g. Perfect quality for our conference"
          required
          error={errors.title?.message}
          {...register("title")}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            Your review <span className="text-destructive">*</span>
          </label>
          <textarea
            {...register("body")}
            rows={5}
            placeholder="Tell others about the print quality, delivery speed, and overall experience…"
            className={cn(
              "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none",
              "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors",
              errors.body && "border-destructive"
            )}
          />
          {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-10 px-4 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "flex-1 h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
              "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
              "disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            )}
          >
            {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : "Submit Review"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>}>
      <ReviewForm />
    </Suspense>
  );
}
