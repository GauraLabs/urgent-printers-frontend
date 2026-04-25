"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/common/FormField";
import { register as apiRegister } from "@/lib/api";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(50),
    lastName: z.string().min(1, "Last name is required").max(50),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
      .optional()
      .or(z.literal("")),
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
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    try {
      await apiRegister({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      toast.success("Account created! Please verify your email.");
      router.push(`${ROUTES.verifyOtp}?email=${encodeURIComponent(data.email)}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="font-heading font-bold text-2xl">Create account</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Join Urgent Printers — it only takes a minute
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

        <FormField
          label="Mobile number"
          type="tel"
          autoComplete="tel"
          placeholder="9876543210"
          hint="10-digit Indian mobile number (optional)"
          error={errors.phone?.message}
          {...register("phone")}
        />

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
            "w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-2",
            "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
            "disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          )}
        >
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Create Account"}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-border text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={ROUTES.login} className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
