"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { StruckMrp, DiscountBadge } from "@/components/common/PriceDisplay";
import { formatCardPrice, formatPrice, round2 } from "@/lib/utils";

/** What the configurator reports; every price shown outside it (price line, sticky bar) derives from this. */
export interface ConfiguratorState {
  isInCart: boolean;
  totalPrice: number;
  savings: number;
  discountPercent?: number;
  quantityLabel?: string;
  quantityEmpty?: boolean;
}

interface PdpState {
  state: ConfiguratorState;
  setState: (s: ConfiguratorState) => void;
}

const PdpStateContext = createContext<PdpState | null>(null);

export function PdpStateProvider({ initialTotal, children }: { initialTotal: number; children: ReactNode }) {
  const [state, setState] = useState<ConfiguratorState>({ isInCart: false, totalPrice: initialTotal, savings: 0 });
  const value = useMemo(() => ({ state, setState }), [state]);
  return <PdpStateContext value={value}>{children}</PdpStateContext>;
}

export function usePdpState(): PdpState {
  const ctx = useContext(PdpStateContext);
  if (!ctx) throw new Error("usePdpState must be used inside PdpStateProvider");
  return ctx;
}

export interface PdpPriceSummary {
  total: string;
  quantity: string | undefined;
  mrpTotal: number | undefined;
  percent: number | undefined;
  saving: string | undefined;
}

/** The one place the PDP's total / MRP / saving strings are derived from the configurator state. */
export function summarisePdpPrice(s: ConfiguratorState): PdpPriceSummary {
  const hasDiscount = s.savings > 0;
  return {
    total: formatPrice(s.totalPrice),
    quantity: s.quantityLabel,
    mrpTotal: hasDiscount ? round2(s.totalPrice + s.savings) : undefined,
    percent: hasDiscount ? s.discountPercent : undefined,
    saving: hasDiscount ? formatCardPrice(s.savings) : undefined,
  };
}

/** Compact "₹3,937.50 for 50 pcs  ₹4,375 -10% off" line under the title on mobile. */
export function PdpPriceLineView({ state }: { state: ConfiguratorState }) {
  const p = summarisePdpPrice(state);
  return (
    <p data-testid="pdp-price-line" className="md:hidden mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="font-heading font-bold text-xl tabular-nums">{p.total}</span>
      {p.quantity && <span className="text-sm text-muted-foreground">for {p.quantity}</span>}
      {p.mrpTotal !== undefined && <StruckMrp mrp={p.mrpTotal} compact className="text-xs" />}
      {p.percent !== undefined && <DiscountBadge percent={p.percent} />}
    </p>
  );
}

export function MobilePriceLine() {
  return <PdpPriceLineView state={usePdpState().state} />;
}
