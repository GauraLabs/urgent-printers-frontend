import Link from "next/link";
import { Printer } from "lucide-react";
import { HeaderSearch } from "./HeaderSearch";
import { HeaderActions } from "./HeaderActions";
import { ThemeSelector } from "./ThemeSelector";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Products", href: ROUTES.products },
  { label: "Business Cards", href: ROUTES.category("business-cards") },
  { label: "Flyers", href: ROUTES.category("flyers") },
  { label: "Banners", href: ROUTES.category("banners") },
  { label: "Packaging", href: ROUTES.category("packaging") },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-4">
          {/* Logo */}
          <Link
            href={ROUTES.home}
            className="flex items-center gap-2 shrink-0 font-heading font-bold text-primary"
            aria-label="Urgent Printers — home"
          >
            <Printer size={22} className="text-brand-orange" />
            <span className="text-base leading-none">
              Urgent<span className="text-brand-orange">Printers</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-4" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground",
                  "hover:text-foreground hover:bg-muted transition-colors"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search */}
          <HeaderSearch />

          {/* Theme + Cart + Auth */}
          <ThemeSelector />
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}
