"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Heart,
  MapPin,
  UserCircle,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { logout } from "@/lib/api";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard",    href: ROUTES.account,           icon: LayoutDashboard, exact: true  },
  { label: "My Orders",    href: ROUTES.accountOrders,     icon: Package,         exact: false },
  { label: "Saved Items",  href: ROUTES.accountSaved,      icon: Heart,           exact: false },
  { label: "Addresses",    href: ROUTES.accountAddresses,  icon: MapPin,          exact: false },
  { label: "Profile",      href: ROUTES.accountProfile,    icon: UserCircle,      exact: false },
] as const;

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearUser = useAuthStore((s) => s.clearUser);

  async function handleLogout() {
    await logout();
    clearUser();
    router.replace(ROUTES.home);
  }

  return (
    <aside className="w-full lg:w-56 shrink-0">
      {/* User chip */}
      <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-secondary/50">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 font-heading font-bold text-primary text-sm">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      {/* Nav links */}
      <nav aria-label="Account navigation" className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon size={16} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors mt-2 w-full text-left"
        >
          <LogOut size={16} className="shrink-0" />
          Sign Out
        </button>
      </nav>
    </aside>
  );
}
