"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CategoryTile } from "@/features/navigation/CategoryTile";
import { useMobileMenuStore } from "@/features/navigation/mobileMenuStore";
import { useNavCategories } from "@/features/navigation/NavCategoriesContext";
import type { NavCategory } from "@/features/navigation/buildCategoryTree";
import { useAuthStore } from "@/features/auth/store";
import { useMounted } from "@/hooks/useMounted";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { NavLink } from "@/lib/api";

interface MobileNavDrawerProps {
  navLinks: NavLink[];
}

const ROW = "flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted";

const HELP_LINKS = [
  { label: "FAQs", href: ROUTES.faq },
  { label: "Contact us", href: "/contact" },
  { label: "Shipping info", href: "/policies/shipping" },
  { label: "Returns policy", href: "/policies/returns" },
  { label: "Artwork guidelines", href: "/policies/artwork-guidelines" },
  { label: "Privacy policy", href: "/policies/privacy" },
];

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function CategoryRow({ category, onNavigate, depth }: { category: NavCategory; onNavigate: () => void; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = category.children.length > 0;
  const panelId = `mobile-cat-${category.slug}`;

  return (
    <li>
      <div className="flex items-center">
        <Link
          href={ROUTES.category(category.slug)}
          onClick={onNavigate}
          className={cn(ROW, "flex-1 min-w-0 gap-3", depth > 0 && "text-muted-foreground")}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {depth === 0 && <CategoryTile name={category.name} imageUrl={category.imageUrl} className="h-9 w-9 text-sm" sizes="36px" />}
          <span className="truncate">{category.name}</span>
          <span className="ml-auto text-xs font-normal text-muted-foreground">{category.productCount}</span>
        </Link>
        {hasChildren && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={`${expanded ? "Hide" : "Show"} ${category.name} subcategories`}
            onClick={() => setExpanded((v) => !v)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-muted"
          >
            <ChevronDown size={16} className={cn("transition-transform", expanded && "rotate-180")} aria-hidden="true" />
          </button>
        )}
      </div>
      {hasChildren && (
        <ul id={panelId} hidden={!expanded}>
          {category.children.map((child) => (
            <CategoryRow key={child.slug} category={child} onNavigate={onNavigate} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function MobileNavDrawer({ navLinks }: MobileNavDrawerProps) {
  const categories = useNavCategories();
  const open = useMobileMenuStore((s) => s.open);
  const setOpen = useMobileMenuStore((s) => s.setOpen);
  const pathname = usePathname();
  const mounted = useMounted();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const signedIn = mounted && isAuthenticated && !!user;

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="flex lg:hidden items-center justify-center h-11 w-11 -ml-2 rounded-full hover:bg-muted transition-colors"
      >
        <Menu size={20} />
      </SheetTrigger>

      <SheetContent side="left" showCloseButton={false} className="flex flex-col gap-0">
        <SheetHeader className="flex-row items-center justify-between border-b border-border pb-2">
          <SheetTitle className="font-heading text-base">Menu</SheetTitle>
          <SheetClose
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"
          >
            <X size={18} aria-hidden="true" />
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-3 space-y-5">
          {categories.length > 0 && (
            <nav aria-labelledby="mobile-occasion-heading">
              <SectionTitle id="mobile-occasion-heading">Shop by occasion</SectionTitle>
              <ul>
                {categories.map((c) => (
                  <CategoryRow key={c.slug} category={c} onNavigate={close} depth={0} />
                ))}
              </ul>
              <Link href={ROUTES.products} onClick={close} className={cn(ROW, "text-primary")}>
                View all products
              </Link>
            </nav>
          )}

          {navLinks.length > 0 && (
            <nav aria-labelledby="mobile-quick-heading">
              <SectionTitle id="mobile-quick-heading">Quick links</SectionTitle>
              <ul>
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} onClick={close} className={cn(ROW, "text-muted-foreground hover:text-foreground")}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <nav aria-labelledby="mobile-account-heading">
            <SectionTitle id="mobile-account-heading">Account</SectionTitle>
            <ul>
              {signedIn ? (
                <>
                  <li><Link href={ROUTES.account} onClick={close} className={ROW}>My account</Link></li>
                  <li><Link href={ROUTES.accountOrders} onClick={close} className={ROW}>Orders</Link></li>
                  <li><Link href={ROUTES.accountSaved} onClick={close} className={ROW}>Saved items</Link></li>
                </>
              ) : (
                <li><Link href={ROUTES.login} onClick={close} className={ROW}>Sign in</Link></li>
              )}
            </ul>
          </nav>

          <nav aria-labelledby="mobile-help-heading">
            <SectionTitle id="mobile-help-heading">Help</SectionTitle>
            <ul>
              {HELP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={close} className={cn(ROW, "text-muted-foreground hover:text-foreground")}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
