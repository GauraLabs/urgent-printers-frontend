"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/common/FormField";
import { useAuthStore } from "@/features/auth/store";
import { login } from "@/lib/api";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    try {
      const { user, token } = await login(data.email, data.password);
      setUser(user, token);
      toast.success(`Welcome back, ${user.firstName}!`);
      const redirect = searchParams.get("redirect") ?? ROUTES.account;
      router.replace(redirect);
    } catch {
      toast.error("Invalid email or password. Please try again.");
    }
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="font-heading font-bold text-2xl">Sign in</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back — sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <FormField
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
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
          <Link href="#" className="text-xs text-primary hover:underline self-end">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-1",
            "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
            "disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          )}
        >
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-border text-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href={ROUTES.register} className="text-primary font-medium hover:underline">Create one</Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
