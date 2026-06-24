"use client";

import { Suspense, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { getFirebaseAuth, getAuthErrorMessage } from "@/lib/firebase";
import { Eye, EyeOff, Loader2, Smartphone, Mail, Globe, ArrowLeft, RefreshCw, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/common/FormField";
import { OTPInputs } from "@/features/auth/OTPInputs";
import { useAuthStore } from "@/features/auth/store";
import { useCountdown } from "@/hooks/useCountdown";
import { login, firebaseVerifyPhone, firebaseVerifyPhoneLink, loginWithGoogle, completeProfile } from "@/lib/api";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthMethod = "phone" | "google" | "email";
type PhoneStep = "enter_phone" | "enter_otp" | "complete_profile";

const METHODS: { id: AuthMethod; label: string; icon: React.ElementType }[] = [
  { id: "phone", label: "Mobile", icon: Smartphone },
  { id: "google", label: "Google", icon: Globe },
  { id: "email", label: "Email", icon: Mail },
];

// ─── Shared schemas ───────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type EmailValues = z.infer<typeof emailSchema>;

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
});
type ProfileValues = z.infer<typeof profileSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhoneFlow({ onDone }: { onDone: () => void }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [step, setStep] = useState<PhoneStep>("enter_phone");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [resendCooldown, setResendCooldown] = useCountdown();

  const recaptchaRef    = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
  });

  function getVerifier(): RecaptchaVerifier {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(
        getFirebaseAuth(),
        "recaptcha-container",
        { size: "invisible" }
      );
    }
    return recaptchaRef.current;
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setPhoneError("Enter a valid 10-digit mobile number");
      return;
    }
    setPhoneError("");
    setSending(true);
    try {
      const confirmation = await signInWithPhoneNumber(getFirebaseAuth(), `+91${digits}`, getVerifier());
      confirmationRef.current = confirmation;
      setStep("enter_otp");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(`OTP sent to +91 ${digits}`);
    } catch (err) {
      console.error("Send OTP failed:", err);
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      toast.error(getAuthErrorMessage(err, "Failed to send OTP. Please try again."));
    } finally {
      setSending(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      const confirmation = await signInWithPhoneNumber(getFirebaseAuth(), `+91${phone}`, getVerifier());
      confirmationRef.current = confirmation;
      setOtpError(false);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("OTP resent");
    } catch (err) {
      console.error("Resend OTP failed:", err);
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      toast.error(getAuthErrorMessage(err, "Failed to resend OTP. Please try again."));
    } finally {
      setResending(false);
    }
  }

  const handleOtpComplete = useCallback(async (otp: string) => {
    if (!confirmationRef.current) {
      toast.error("Session expired. Please request a new OTP.");
      setStep("enter_phone");
      return;
    }
    setOtpError(false);
    setVerifying(true);
    try {
      const result       = await confirmationRef.current.confirm(otp);
      const firebaseToken = await result.user.getIdToken();
      const { user, token, isNewUser } = await firebaseVerifyPhone(firebaseToken);
      if (isNewUser) {
        setPendingToken(token);
        setStep("complete_profile");
      } else {
        setUser(user, token);
        toast.success(`Welcome back, ${user.firstName}!`);
        onDone();
      }
    } catch (err) {
      setOtpError(true);
      toast.error(getAuthErrorMessage(err, "Incorrect OTP. Please check and try again."));
    } finally {
      setVerifying(false);
    }
  }, [setUser, onDone]);

  async function handleCompleteProfile(data: ProfileValues) {
    try {
      const updatedUser = await completeProfile(pendingToken, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
      });
      setUser(updatedUser, pendingToken);
      toast.success(`Welcome to Urgent Printers, ${updatedUser.firstName}!`);
      onDone();
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  // Step 1: Phone number entry
  if (step === "enter_phone") {
    return (
      <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
        {/* Invisible reCAPTCHA mount point — Firebase requires a DOM element */}
        <div id="recaptcha-container" />

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Mobile number <span className="text-destructive">*</span>
          </label>
          <div className="flex rounded-xl border border-border overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
            <span className="flex items-center px-3 bg-muted text-muted-foreground text-sm font-medium border-r border-border shrink-0">
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setPhoneError(""); }}
              placeholder="98765 43210"
              autoComplete="tel-national"
              className="flex-1 px-3 py-2.5 text-sm bg-background focus:outline-none"
            />
          </div>
          {phoneError && <p className="text-destructive text-xs mt-1">{phoneError}</p>}
        </div>

        <button
          type="submit"
          disabled={sending}
          className={cn(
            "w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
            "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
            "disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          )}
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : "Send OTP"}
        </button>

        <p className="text-xs text-muted-foreground text-center">
          A 6-digit OTP will be sent to your number via SMS
        </p>
      </form>
    );
  }

  // Step 2: OTP entry
  if (step === "enter_otp") {
    return (
      <div className="flex flex-col gap-5">
        {/* Invisible reCAPTCHA mount point — needed here too so Resend OTP works */}
        <div id="recaptcha-container" />

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            OTP sent to <span className="font-semibold text-foreground">+91 {phone}</span>
          </p>
          <button
            onClick={() => { setStep("enter_phone"); setOtpError(false); }}
            className="text-xs text-primary hover:underline mt-0.5 flex items-center gap-1 mx-auto"
          >
            <ArrowLeft size={11} /> Change number
          </button>
        </div>

        {verifying ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={26} className="animate-spin text-primary" />
          </div>
        ) : (
          <OTPInputs onComplete={handleOtpComplete} disabled={verifying} error={otpError} />
        )}
        {otpError && (
          <p className="text-destructive text-xs text-center -mt-2">
            Incorrect or expired OTP. Please try again.
          </p>
        )}

        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1.5">Didn&apos;t receive it?</p>
          <button
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline mx-auto disabled:opacity-60 disabled:no-underline"
          >
            {resending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Profile completion (new users)
  return (
    <form onSubmit={handleSubmit(handleCompleteProfile)} className="flex flex-col gap-4">
      <div className="text-center mb-1">
        <p className="text-sm font-semibold">One last step</p>
        <p className="text-xs text-muted-foreground mt-0.5">Tell us your name to complete sign-up</p>
      </div>
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
        placeholder="you@example.com (optional)"
        error={errors.email?.message}
        {...register("email")}
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
        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Complete Sign Up"}
      </button>
    </form>
  );
}

type GoogleStep = "button" | "enter_phone" | "enter_otp";

function GoogleButton({ onDone }: { onDone: () => void }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [gStep, setGStep] = useState<GoogleStep>("button");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [resendCooldown, setResendCooldown] = useCountdown();
  const [pendingToken, setPendingToken] = useState("");

  const recaptchaRef    = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  function getVerifier(): RecaptchaVerifier {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(
        getFirebaseAuth(),
        "recaptcha-container-google",
        { size: "invisible" }
      );
    }
    return recaptchaRef.current;
  }

  function handleGoogle() {
    if (!window.google) {
      toast.error("Google sign-in is not ready. Please refresh and try again.");
      return;
    }

    setLoading(true);

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: async ({ credential }) => {
        try {
          const { user, token, isNewUser } = await loginWithGoogle(credential);
          if (isNewUser) {
            setPendingToken(token);
            setGStep("enter_phone");
            toast.success("Google account verified! Please add your mobile number.");
          } else {
            setUser(user, token);
            toast.success(`Welcome back, ${user.firstName}!`);
            onDone();
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Google sign-in failed");
        } finally {
          setLoading(false);
        }
      },
    });

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setLoading(false);
        if (!notification.isDismissedMoment()) {
          toast.error("Google sign-in unavailable. Please use phone or email.");
        }
      }
    });
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) { setPhoneError("Enter a valid 10-digit mobile number"); return; }
    setPhoneError("");
    setSending(true);
    try {
      const confirmation = await signInWithPhoneNumber(getFirebaseAuth(), `+91${digits}`, getVerifier());
      confirmationRef.current = confirmation;
      setGStep("enter_otp");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(`OTP sent to +91 ${digits}`);
    } catch (err) {
      console.error("Send OTP failed:", err);
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      toast.error(getAuthErrorMessage(err, "Failed to send OTP. Please try again."));
    } finally {
      setSending(false);
    }
  }

  const handleOtpComplete = useCallback(async (otp: string) => {
    if (!confirmationRef.current) {
      toast.error("Session expired. Please request a new OTP.");
      setGStep("enter_phone");
      return;
    }
    setOtpError(false);
    setVerifying(true);
    try {
      const result        = await confirmationRef.current.confirm(otp);
      const firebaseToken = await result.user.getIdToken();
      const updatedUser   = await firebaseVerifyPhoneLink(firebaseToken, pendingToken);
      setUser(updatedUser, pendingToken);
      toast.success(`Welcome to Urgent Printers, ${updatedUser.firstName}!`);
      onDone();
    } catch (err) {
      setOtpError(true);
      toast.error(getAuthErrorMessage(err, "Incorrect OTP. Please check and try again."));
    } finally {
      setVerifying(false);
    }
  }, [pendingToken, setUser, onDone]);

  async function handleResend() {
    setResending(true);
    try {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      const confirmation = await signInWithPhoneNumber(getFirebaseAuth(), `+91${phone}`, getVerifier());
      confirmationRef.current = confirmation;
      setOtpError(false);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("OTP resent");
    } catch (err) {
      console.error("Resend OTP failed:", err);
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      toast.error(getAuthErrorMessage(err, "Failed to resend OTP. Please try again."));
    } finally {
      setResending(false);
    }
  }

  // Google sign-in button
  if (gStep === "button") {
    return (
      <div className="flex flex-col items-center gap-4 py-2">
        <button
          onClick={handleGoogle}
          disabled={loading}
          className={cn(
            "w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 border border-border",
            "bg-background hover:bg-muted transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </>
          )}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          We&apos;ll use your Google account details to sign you in or create an account.
        </p>
      </div>
    );
  }

  // Phone collection (new Google user)
  if (gStep === "enter_phone") {
    return (
      <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
        {/* Invisible reCAPTCHA mount point for Google flow */}
        <div id="recaptcha-container-google" />

        <p className="text-sm text-center text-muted-foreground">
          Add your mobile number to complete sign-up
        </p>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Mobile number <span className="text-destructive">*</span>
          </label>
          <div className="flex rounded-xl border border-border overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
            <span className="flex items-center px-3 bg-muted text-muted-foreground text-sm font-medium border-r border-border shrink-0">+91</span>
            <input
              type="tel" inputMode="numeric" maxLength={10}
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setPhoneError(""); }}
              placeholder="98765 43210"
              autoComplete="tel-national"
              className="flex-1 px-3 py-2.5 text-sm bg-background focus:outline-none"
            />
          </div>
          {phoneError && <p className="text-destructive text-xs mt-1">{phoneError}</p>}
        </div>
        <button type="submit" disabled={sending}
          className={cn("w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
            "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
            "disabled:opacity-60 disabled:cursor-not-allowed transition-all")}>
          {sending ? <Loader2 size={18} className="animate-spin" /> : "Send OTP"}
        </button>
      </form>
    );
  }

  // OTP verification (new Google user)
  return (
    <div className="flex flex-col gap-5">
      {/* Invisible reCAPTCHA mount point — needed here too so Resend OTP works */}
      <div id="recaptcha-container-google" />

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          OTP sent to <span className="font-semibold text-foreground">+91 {phone}</span>
        </p>
        <button onClick={() => { setGStep("enter_phone"); setOtpError(false); }}
          className="text-xs text-primary hover:underline mt-0.5 flex items-center gap-1 mx-auto">
          <ArrowLeft size={11} /> Change number
        </button>
      </div>
      {verifying
        ? <div className="flex justify-center py-4"><Loader2 size={26} className="animate-spin text-primary" /></div>
        : <OTPInputs onComplete={handleOtpComplete} disabled={verifying} error={otpError} />
      }
      {otpError && (
        <p className="text-destructive text-xs text-center -mt-2">
          Incorrect or expired OTP. Please try again.
        </p>
      )}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1.5">Didn&apos;t receive it?</p>
        <button onClick={handleResend} disabled={resending || resendCooldown > 0}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline mx-auto disabled:opacity-60 disabled:no-underline">
          {resending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
        </button>
      </div>
    </div>
  );
}

function EmailForm({ onDone }: { onDone: () => void }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
  });

  async function onSubmit(data: EmailValues) {
    try {
      const { user, token } = await login(data.email, data.password);
      setUser(user, token);
      toast.success(`Welcome back, ${user.firstName}!`);
      onDone();
    } catch {
      toast.error("Invalid email or password. Please try again.");
    }
  }

  return (
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
      <Link href="#" className="text-xs text-primary hover:underline self-end -mt-2">
        Forgot password?
      </Link>
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
          "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
          "disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        )}
      >
        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
      </button>
      <p className="text-xs text-muted-foreground text-center">
        No account?{" "}
        <Link href={ROUTES.register} className="text-primary font-medium hover:underline">
          Create one with email
        </Link>
      </p>
    </form>
  );
}

// ─── Main login page ──────────────────────────────────────────────────────────

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [method, setMethod] = useState<AuthMethod>("phone");

  function handleDone() {
    const redirect = searchParams.get("redirect") ?? ROUTES.account;
    router.replace(redirect);
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl">Sign in</h1>
        <p className="text-muted-foreground text-sm mt-1">
          New or returning — we&apos;ll sort it out
        </p>
      </div>

      {/* Method selector */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-xl mb-6">
        {METHODS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMethod(id)}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all",
              method === id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {method === "phone" && <PhoneFlow onDone={handleDone} />}
      {method === "google" && <GoogleButton onDone={handleDone} />}
      {method === "email" && <EmailForm onDone={handleDone} />}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-8">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
