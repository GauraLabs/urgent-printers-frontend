"use client";

import { useState } from "react";
import { ArrowRight, Truck, Lock, ShieldCheck, QrCode, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SelectableCard } from "@/components/ui/selectable-card";

export type PaymentMethod = "online" | "cod";

interface PaymentStepProps {
  onNext: (method: PaymentMethod) => void;
  onBack: () => void;
}

// ─── Icon components — all SVGs are self-hosted in /public/images/payment/ ───

function AppIcon({ src, name }: { src: string; name: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center overflow-hidden shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} width={24} height={24} className="object-contain" />
      </div>
      <span className="text-[9px] text-muted-foreground font-medium">{name}</span>
    </div>
  );
}

function CardNetworkIcon({ src, name }: { src: string; name: string }) {
  return (
    <div
      title={name}
      className="w-9 h-[22px] rounded-[4px] bg-white border border-border flex items-center justify-center overflow-hidden shadow-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} width={28} height={16} className="object-contain" />
    </div>
  );
}

const UPI_APPS = [
  { src: "/images/payment/gpay.svg",     name: "GPay"     },
  { src: "/images/payment/phonepe.svg",  name: "PhonePe"  },
  { src: "/images/payment/paytm.svg",    name: "Paytm"    },
  { src: "/images/payment/bhim.svg",     name: "BHIM"     },
  { src: "/images/payment/amazon.svg",   name: "Amazon"   },
];

const CARD_NETWORKS = [
  { src: "/images/payment/visa.svg",       name: "Visa"       },
  { src: "/images/payment/mastercard.svg", name: "Mastercard" },
  { src: "/images/payment/rupay.svg",      name: "RuPay"      },
  { src: "/images/payment/amex.svg",       name: "Amex"       },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentStep({ onNext, onBack }: PaymentStepProps) {
  const [selected, setSelected] = useState<PaymentMethod>("online");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-bold text-lg">Payment Method</h2>
        <p className="text-muted-foreground text-sm mt-1">Choose how you want to pay</p>
      </div>

      <div className="space-y-3">

        {/* ── Pay Online ── */}
        <SelectableCard
          selected={selected === "online"}
          onClick={() => setSelected("online")}
          className="w-full p-4 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
              selected === "online" ? "border-primary" : "border-muted-foreground"
            )}>
              {selected === "online" && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Pay Online</p>
              <p className="text-xs text-muted-foreground">UPI · Cards · Net Banking · QR</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/15 text-success shrink-0">
              Recommended
            </span>
          </div>

          {/* UPI apps */}
          <div className="pl-7 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">UPI Apps</p>
            <div className="flex items-end gap-3 flex-wrap">
              {UPI_APPS.map((app) => (
                <AppIcon key={app.name} src={app.src} name={app.name} />
              ))}
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center">
                  <span className="text-xs text-muted-foreground font-bold">+</span>
                </div>
                <span className="text-[9px] text-muted-foreground font-medium">more</span>
              </div>
            </div>
          </div>

          {/* Card networks */}
          <div className="pl-7 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cards</p>
            <div className="flex items-center gap-2 flex-wrap">
              {CARD_NETWORKS.map((card) => (
                <CardNetworkIcon key={card.name} src={card.src} name={card.name} />
              ))}
            </div>
          </div>

          {/* Other methods */}
          <div className="pl-7 flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted border border-border">
              <Building2 size={12} className="text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">Net Banking</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted border border-border">
              <QrCode size={12} className="text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">QR Code</span>
            </div>
          </div>

          {/* Razorpay security note */}
          <div className="pl-7 flex items-center gap-1.5">
            <Lock size={11} className="text-primary shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Select your method inside Razorpay&apos;s secure checkout
            </p>
          </div>
        </SelectableCard>

        {/* ── Cash on Delivery ── */}
        <SelectableCard
          selected={selected === "cod"}
          onClick={() => setSelected("cod")}
          className="w-full p-4"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
              selected === "cod" ? "border-primary" : "border-muted-foreground"
            )}>
              {selected === "cod" && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              selected === "cod" ? "bg-primary/10" : "bg-muted"
            )}>
              <Truck size={18} className={selected === "cod" ? "text-primary" : "text-muted-foreground"} />
            </div>
            <div>
              <p className="font-semibold text-sm">Cash on Delivery</p>
              <p className="text-xs text-muted-foreground">Pay in cash when your order arrives</p>
            </div>
          </div>
        </SelectableCard>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck size={13} className="text-success shrink-0" />
        Online payments processed by Razorpay · PCI DSS Level 1 · 256-bit SSL
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="h-11 px-5 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => onNext(selected)}
          className={cn(
            "flex-1 h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
            "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground transition-all"
          )}
        >
          Review Order <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
