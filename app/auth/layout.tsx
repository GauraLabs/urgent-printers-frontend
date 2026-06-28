import Link from "next/link";
import { Logo } from "@/components/common/Logo";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link href={ROUTES.home} className="flex items-center mb-8">
        <Logo style={{ height: 32 }} />
      </Link>

      {/* Card */}
      <Card className="w-full max-w-md rounded-2xl p-8">
        {children}
      </Card>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        By continuing you agree to our{" "}
        <Link href="#" className="underline hover:text-foreground">Terms of Service</Link>
        {" "}and{" "}
        <Link href="#" className="underline hover:text-foreground">Privacy Policy</Link>.
      </p>
    </div>
  );
}
