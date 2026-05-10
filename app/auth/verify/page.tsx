"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { verifyOtp, login } from "@/lib/api";
import { OTPInputs } from "@/features/auth/OTPInputs";
import { useAuthStore } from "@/features/auth/store";
import { ROUTES } from "@/lib/constants/routes";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const setUser = useAuthStore((s) => s.setUser);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleComplete = useCallback(async (otp: string) => {
    setIsVerifying(true);
    try {
      const { verified } = await verifyOtp(email, otp);
      if (!verified) {
        toast.error("Incorrect OTP. Please try again.");
        return;
      }
      const { user, token } = await login(email, "verified");
      setUser(user, token);
      toast.success("Email verified! Welcome to Urgent Printers.");
      router.replace(ROUTES.account);
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }, [email, setUser, router]);

  async function handleResend() {
    setIsResending(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsResending(false);
    toast.success("OTP resent to your email.");
  }

  return (
    <>
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <MailCheck size={26} className="text-primary" />
        </div>
        <h1 className="font-heading font-bold text-2xl">Verify your email</h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-xs">
          We sent a 6-digit OTP to{" "}
          <span className="font-semibold text-foreground">{email || "your email"}</span>.
          Enter it below.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Demo hint: use <span className="font-mono font-bold">123456</span>
        </p>
      </div>

      {isVerifying ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : (
        <OTPInputs onComplete={handleComplete} disabled={isVerifying} />
      )}

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">Didn&apos;t receive it?</p>
        <button
          onClick={handleResend}
          disabled={isResending}
          className="flex items-center gap-1.5 text-sm text-primary hover:underline mx-auto disabled:opacity-60"
        >
          {isResending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Resend OTP
        </button>
      </div>
    </>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
