"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Search, ShoppingBag, User } from "lucide-react";
import { useCartStore } from "@/features/cart/store";
import { useMounted } from "@/hooks/useMounted";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home",       href: ROUTES.home,     icon: Home,       exact: true  },
  { label: "Categories", href: ROUTES.products,  icon: LayoutGrid, exact: false },
  { label: "Search",     href: ROUTES.search,    icon: Search,     exact: false },
  { label: "Cart",       href: null,             icon: ShoppingBag,exact: false },
  { label: "Account",    href: ROUTES.account,   icon: User,       exact: false },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const mounted = useMounted();

  const itemCount = useCartStore((s) => s.itemCount());
  const openCart = useCartStore((s) => s.openCart);

  // Suppress persisted value until after hydration
  const displayCount = mounted ? itemCount : 0;

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="flex items-center h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href
            ? item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            : false;

          const Icon = item.icon;

          if (item.href === null) {
            return (
              <button
                key="cart"
                onClick={openCart}
                aria-label={`Cart${displayCount > 0 ? `, ${displayCount} item${displayCount !== 1 ? "s" : ""}` : ""}`}
                className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] relative"
              >
                <span className="relative">
                  <Icon size={22} />
                  {displayCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-brand-orange text-brand-orange-foreground text-[9px] font-bold leading-none">
                      {displayCount > 99 ? "99+" : displayCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] leading-none font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={22} />
              <span className="text-[10px] leading-none font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
