"use client";

import { create } from "zustand";

interface MobileMenuStore {
  open: boolean;
  setOpen: (open: boolean) => void;
}

/** Not persisted: lets MobileBottomNav's "Categories" tab open the header drawer. */
export const useMobileMenuStore = create<MobileMenuStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
