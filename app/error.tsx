"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // REAL API: log to error reporting service (e.g. Sentry)
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
        <AlertTriangle size={28} className="text-destructive" />
      </div>

      <h1 className="font-heading font-bold text-2xl mb-2">Something went wrong</h1>
      <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
        An unexpected error occurred. Our team has been notified. Please try again or go back home.
      </p>

      {error.digest && (
        <p className="text-xs text-muted-foreground font-mono mb-6">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={reset}
          className={cn(
            buttonVariants(),
            "gap-2 bg-primary hover:bg-primary/90 text-primary-foreground justify-center"
          )}
        >
          <RefreshCw size={15} /> Try Again
        </button>
        <Link
          href={ROUTES.home}
          className={cn(buttonVariants({ variant: "outline" }), "gap-2 justify-center")}
        >
          <Home size={15} /> Go Home
        </Link>
      </div>
    </div>
  );
}
