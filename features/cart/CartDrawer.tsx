"use client";

import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCartStore } from "./store";
import { CartDrawerItem } from "./CartDrawerItem";
import { formatPrice, cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants/routes";

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <SheetTitle className="font-heading flex items-center gap-2">
            <ShoppingBag size={18} className="text-brand-orange" />
            Your Cart
            {itemCount > 0 && (
              <span className="text-muted-foreground font-normal text-sm">
                ({itemCount} item{itemCount !== 1 ? "s" : ""})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <ShoppingBag size={28} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-heading font-semibold">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add some products to get started.
              </p>
            </div>
            <Link
              href={ROUTES.products}
              onClick={closeCart}
              className={buttonVariants({ variant: "outline" })}
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            {/* Item list */}
            <ScrollArea className="flex-1 px-6">
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <CartDrawerItem key={item.cartItemId} item={item} />
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border space-y-4">
              {/* Free delivery nudge */}
              {subtotal < 999 ? (
                <p className="text-xs text-center text-muted-foreground">
                  Add{" "}
                  <span className="font-semibold text-foreground">
                    {formatPrice(999 - subtotal)}
                  </span>{" "}
                  more for free delivery
                </p>
              ) : (
                <p className="text-xs text-center text-success font-medium">
                  You qualify for free delivery!
                </p>
              )}

              <Separator />

              <div className="flex items-center justify-between font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              <p className="text-xs text-muted-foreground -mt-2">
                Shipping and GST calculated at checkout.
              </p>

              <Link
                href={ROUTES.checkout}
                onClick={closeCart}
                className={cn(
                  buttonVariants(),
                  "w-full bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground font-semibold justify-center"
                )}
              >
                Checkout
                <ArrowRight size={16} className="ml-2" />
              </Link>

              <Link
                href={ROUTES.cart}
                onClick={closeCart}
                className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
              >
                View Full Cart
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
