"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PasswordField } from "@/features/auth/PasswordFields";
import {
  changePasswordSchema,
  setPasswordSchema,
  type ChangePasswordValues,
  type ResetPasswordValues,
} from "@/features/auth/passwordSchemas";
import { useAuthStore } from "@/features/auth/store";
import { changePassword, passwordErrorMessage } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

const SUBMIT_CLASS = cn(
  "flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold",
  "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
  "disabled:opacity-50 disabled:cursor-not-allowed transition-all"
);

function SetPasswordForm() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ResetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordValues) {
    if (!token) return;
    try {
      const { user: updated, token: fresh } = await changePassword(token, { currentPassword: null, newPassword: data.newPassword });
      setUser({ ...updated, hasPassword: updated.hasPassword ?? true }, fresh ?? token);
      reset();
      toast.success("Password set. You can now sign in with your email and password.");
    } catch (err) {
      toast.error(passwordErrorMessage(err, "Could not set your password. Please try again."));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <PasswordField label="New password" autoComplete="new-password" hint="8 to 128 characters." error={errors.newPassword?.message} {...register("newPassword")} />
      <PasswordField label="Confirm password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
      <button type="submit" disabled={isSubmitting} className={SUBMIT_CLASS}>
        {isSubmitting && <Loader2 size={15} className="animate-spin" />}
        Set password
      </button>
    </form>
  );
}

function ChangePasswordForm() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function onSubmit(data: ChangePasswordValues) {
    if (!token) return;
    try {
      const { user: updated, token: fresh } = await changePassword(token, { currentPassword: data.currentPassword, newPassword: data.newPassword });
      setUser({ ...updated, hasPassword: updated.hasPassword ?? true }, fresh ?? token);
      reset();
      toast.success("Password changed.");
    } catch (err) {
      toast.error(passwordErrorMessage(err, "Could not change your password. Please try again."));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <PasswordField label="Current password" autoComplete="current-password" error={errors.currentPassword?.message} {...register("currentPassword")} />
      <PasswordField label="New password" autoComplete="new-password" hint="8 to 128 characters." error={errors.newPassword?.message} {...register("newPassword")} />
      <PasswordField label="Confirm password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
      <button type="submit" disabled={isSubmitting} className={SUBMIT_CLASS}>
        {isSubmitting && <Loader2 size={15} className="animate-spin" />}
        Change password
      </button>
    </form>
  );
}

export function PasswordSection() {
  const user = useAuthStore((s) => s.user);
  // Backend without has_password: show nothing rather than guess which form applies.
  if (!user || user.hasPassword === undefined) return null;

  return (
    <section className="space-y-3" aria-labelledby="password-heading">
      <h2 id="password-heading" className="font-heading font-semibold text-lg">
        {user.hasPassword ? "Change password" : "Set password"}
      </h2>
      {!user.hasPassword && (
        <p className="text-xs text-muted-foreground">
          You signed in without a password. Set one to also sign in with your email.
        </p>
      )}
      {user.hasPassword ? <ChangePasswordForm /> : <SetPasswordForm />}
    </section>
  );
}
