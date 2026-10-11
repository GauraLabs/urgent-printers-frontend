"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/common/FormField";
import { FORGOT_PASSWORD_GENERIC_MESSAGE, requestPasswordReset } from "@/lib/api/auth";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { forgotPasswordSchema, type ForgotPasswordValues } from "./passwordSchemas";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordValues) {
    setFailed(false);
    try {
      await requestPasswordReset(data.email);
      setSent(true);
    } catch {
      // The endpoint always answers 200; only a network/server fault lands here.
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading font-bold text-2xl">Forgot password?</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {sent ? (
        <p role="status" className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
          {FORGOT_PASSWORD_GENERIC_MESSAGE}
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FormField
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            error={errors.email?.message}
            {...register("email")}
          />
          {failed && (
            <p role="alert" className="text-sm text-destructive">
              We couldn&apos;t send the request right now. Please try again.
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
              "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
              "disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            )}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Send reset link"}
          </button>
        </form>
      )}

      <Link href={ROUTES.login} className="text-xs text-primary hover:underline text-center">
        Back to sign in
      </Link>
    </div>
  );
}
