"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NavLink } from "@/lib/api";

interface MobileNavDrawerProps {
  navLinks: NavLink[];
}

export function MobileNavDrawer({ navLinks }: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="flex lg:hidden items-center justify-center h-9 w-9 rounded-full hover:bg-muted transition-colors"
      >
        <Menu size={20} />
      </SheetTrigger>

      <SheetContent side="left" className="flex flex-col">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="font-heading text-base">Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
