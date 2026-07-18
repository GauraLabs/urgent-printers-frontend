import Link from "next/link";
import { Logo } from "@/components/common/Logo";
import { HeaderSearch } from "./HeaderSearch";
import { HeaderActions } from "./HeaderActions";
import { ThemeSelector } from "./ThemeSelector";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { getNavLinks } from "@/lib/api";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const FALLBACK_NAV_LINKS = [{ label: "Products", href: ROUTES.products }];

export async function Header() {
  const fetchedLinks = await getNavLinks("header");
  const navLinks = fetchedLinks.length > 0 ? fetchedLinks : FALLBACK_NAV_LINKS;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-4">
          {/* Mobile nav trigger */}
          <MobileNavDrawer navLinks={navLinks} />

          {/* Logo */}
          <Link href={ROUTES.home} className="flex items-center shrink-0" aria-label="Urgent Printers — home">
            <Logo style={{ height: 28 }} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-4" aria-label="Main navigation">
            {navLinks.map((link) => (
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
