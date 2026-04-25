import type { Metadata } from "next";
import Link from "next/link";
import { Printer, ArrowRight, Home, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "404 — Page Not Found",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20 text-center">
      {/* Large 404 */}
      <div className="relative mb-8 select-none">
        <p className="font-heading font-bold text-[10rem] leading-none text-border/60">
          404
        </p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Printer size={36} className="text-primary" />
          </div>
        </div>
      </div>

      <h1 className="font-heading font-bold text-2xl lg:text-3xl mb-3">
        Page Not Found
      </h1>
      <p className="text-muted-foreground text-sm max-w-md mb-8 leading-relaxed">
        Looks like this page has been taken to the printers and never came back.
        Let&rsquo;s get you back on track.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={ROUTES.home}
          className={cn(
            buttonVariants(),
            "gap-2 bg-primary hover:bg-primary/90 text-primary-foreground justify-center"
          )}
        >
          <Home size={15} /> Go Home
        </Link>
        <Link
          href={ROUTES.products}
          className={cn(buttonVariants({ variant: "outline" }), "gap-2 justify-center")}
        >
          Browse Products <ArrowRight size={15} />
        </Link>
        <Link
          href={ROUTES.search}
          className={cn(buttonVariants({ variant: "ghost" }), "gap-2 justify-center")}
        >
          <Search size={15} /> Search
        </Link>
      </div>
    </div>
  );
}
