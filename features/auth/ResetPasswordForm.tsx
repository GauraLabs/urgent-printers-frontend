"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { passwordErrorMessage, resetPassword } from "@/lib/api/auth";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { PasswordField } from "./PasswordFields";
import { resetPasswordSchema, type ResetPasswordValues } from "./passwordSchemas";

export function ResetPasswordForm({ token: tokenFromUrl }: { token: string }) {
  // Held in state so the secret can be stripped from the address bar (history, referrer, analytics).
  const [token] = useState(tokenFromUrl);
  const [tokenExpired, setTokenExpired] = useState(false);
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", ROUTES.resetPassword);
  }, []);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordValues) {
    setError(null);
    try {
      await resetPassword(token, data.newPassword);
      setDone(true);
    } catch (err) {
      setTokenExpired(err instanceof ApiError && err.code === "invalid_or_expired_token");
      setError(passwordErrorMessage(err, "We couldn’t reset your password right now. Please try again."));
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="font-heading font-bold text-2xl">Reset link missing</h1>
        <p role="alert" className="text-sm text-muted-foreground">
          This reset link is incomplete. Please request a new one.
        </p>
        <Link href={ROUTES.forgotPassword} className="text-sm text-primary font-medium hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="font-heading font-bold text-2xl">Password updated</h1>
        <p role="status" className="text-sm text-muted-foreground">
          Your password has been reset. You can now sign in with your new password.
        </p>
        <Link href={ROUTES.login} className="text-sm text-primary font-medium hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading font-bold text-2xl">Choose a new password</h1>
        <p className="text-sm text-muted-foreground mt-1">Use 8 to 128 characters.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <PasswordField
          label="New password"
          autoComplete="new-password"
          required
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}{" "}
            {tokenExpired && (
              <Link href={ROUTES.forgotPassword} className="underline">Request a new link</Link>
            )}
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
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Reset password"}
        </button>
      </form>
    </div>
  );
}
