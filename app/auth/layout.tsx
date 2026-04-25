import Link from "next/link";
import { Printer } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link
        href={ROUTES.home}
        className="flex items-center gap-2 font-heading font-bold text-primary mb-8"
      >
        <Printer size={22} className="text-brand-orange" />
        <span className="text-lg">
          Urgent<span className="text-brand-orange">Printers</span>
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-8">
        {children}
      </div>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        By continuing you agree to our{" "}
        <Link href="#" className="underline hover:text-foreground">Terms of Service</Link>
        {" "}and{" "}
        <Link href="#" className="underline hover:text-foreground">Privacy Policy</Link>.
      </p>
    </div>
  );
}
