"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useCartStore } from "./store";

const CartDrawer = dynamic(() => import("./CartDrawer").then((module) => module.CartDrawer), { ssr: false });

export function LazyCartDrawer() {
  const isOpen = useCartStore((state) => state.isOpen);
  const [hasOpened, setHasOpened] = useState(false);
  useEffect(() => { if (isOpen) setHasOpened(true); }, [isOpen]);
  // Keep the loaded drawer mounted through close animations and subsequent opens.
  if (!isOpen && !hasOpened) return null;
  return <CartDrawer />;
}
