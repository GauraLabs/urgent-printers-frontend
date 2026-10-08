"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { NavCategory } from "./buildCategoryTree";

const NavCategoriesContext = createContext<NavCategory[]>([]);

/** Serialises the menu tree once for both the desktop mega-menu and the mobile drawer. */
export function NavCategoriesProvider({ categories, children }: { categories: NavCategory[]; children: ReactNode }) {
  return <NavCategoriesContext value={categories}>{children}</NavCategoriesContext>;
}

export function useNavCategories(): NavCategory[] {
  return useContext(NavCategoriesContext);
}
