"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/common/FormField";
import { OTPInputs } from "@/features/auth/OTPInputs";
import { useAuthStore } from "@/features/auth/store";
import { initiateRegister, completeRegister, sendOtp } from "@/lib/api";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type Step = "form" | "otp";

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(50),
    lastName: z.string().min(1, "Last name is required").max(50),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [phone, setPhone] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    try {
      await initiateRegister({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });
      setPhone(data.phone);
      setStep("otp");
      toast.success(`OTP sent to +91 ${data.phone}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  const handleOtpComplete = useCallback(async (otp: string) => {
    setVerifying(true);
    try {
      const { user, token } = await completeRegister(phone, otp);
      setUser(user, token);
      toast.success(`Welcome to Urgent Printers, ${user.firstName}!`);
      router.replace(ROUTES.account);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  }, [phone, setUser, router]);

  async function handleResend() {
    setResending(true);
    try {
      await sendOtp(phone);
      toast.success("OTP resent");
    } catch {
      toast.error("Failed to resend OTP");
    } finally {
      setResending(false);
    }
  }

  // ── Step 2: OTP verification ────────────────────────────────────────────────
  if (step === "otp") {
    return (
      <>
        <div className="flex flex-col items-center text-center mb-7">
          <h1 className="font-heading font-bold text-2xl">Verify your mobile</h1>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-xs">
            OTP sent to <span className="font-semibold text-foreground">+91 {phone}</span>
          </p>
          <button
            onClick={() => setStep("form")}
            className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
          >
            <ArrowLeft size={11} /> Change number
          </button>
        </div>

        {verifying ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : (
          <OTPInputs onComplete={handleOtpComplete} disabled={verifying} />
        )}

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground mb-1.5">Didn&apos;t receive it?</p>
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline mx-auto disabled:opacity-60"
          >
            {resending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Resend OTP
          </button>
          <p className="text-[11px] text-muted-foreground mt-3">
            Demo hint: use <span className="font-mono font-bold">123456</span>
          </p>
        </div>
      </>
    );
  }

  // ── Step 1: Registration form ───────────────────────────────────────────────
  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl">Create account</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your mobile number will be verified by OTP
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="First name"
            type="text"
            autoComplete="given-name"
            placeholder="Arjun"
            required
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <FormField
            label="Last name"
            type="text"
            autoComplete="family-name"
            placeholder="Sharma"
            required
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        <FormField
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          error={errors.email?.message}
          {...register("email")}
        />

        {/* Phone with +91 prefix */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Mobile number <span className="text-destructive">*</span>
          </label>
          <div className={cn(
            "flex rounded-xl border overflow-hidden transition-colors",
            "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
            errors.phone ? "border-destructive" : "border-border"
          )}>
            <span className="flex items-center px-3 bg-muted text-muted-foreground text-sm font-medium border-r border-border shrink-0">
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel-national"
              placeholder="98765 43210"
              className="flex-1 px-3 py-2.5 text-sm bg-background focus:outline-none"
              {...register("phone")}
            />
          </div>
          {errors.phone && (
            <p className="text-destructive text-xs mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div className="relative">
          <FormField
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            required
            error={errors.password?.message}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-8 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <FormField
          label="Confirm password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Re-enter your password"
          required
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-1",
            "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
            "disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          )}
        >
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Send OTP to Verify"}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-border text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={ROUTES.login} className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">
          Prefer mobile OTP?{" "}
          <Link href={ROUTES.login} className="text-primary font-medium hover:underline">
            Sign in with phone
          </Link>
        </p>
      </div>
    </>
  );
}
