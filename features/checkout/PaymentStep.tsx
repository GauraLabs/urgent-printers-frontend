"use client";

import { useState } from "react";
import { ArrowRight, Smartphone, CreditCard, Building2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethod = "upi" | "card" | "netbanking" | "cod";

interface PaymentStepProps {
  onNext: (method: PaymentMethod, detail: string) => void;
  onBack: () => void;
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: React.ElementType; description: string }[] = [
  { id: "upi",        label: "UPI",            icon: Smartphone,  description: "Pay via any UPI app — GPay, PhonePe, Paytm"  },
  { id: "card",       label: "Credit / Debit Card", icon: CreditCard,  description: "Visa, Mastercard, RuPay accepted"         },
  { id: "netbanking", label: "Net Banking",     icon: Building2,   description: "All major Indian banks supported"            },
  { id: "cod",        label: "Cash on Delivery",icon: Truck,       description: "Pay in cash when your order arrives"         },
];

const BANKS = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "Punjab National Bank"];

export function PaymentStep({ onNext, onBack }: PaymentStepProps) {
  const [selected, setSelected] = useState<PaymentMethod>("upi");
  const [upiId, setUpiId]       = useState("");
  const [cardNum, setCardNum]   = useState("");
  const [cardExp, setCardExp]   = useState("");
  const [cardCvv, setCardCvv]   = useState("");
  const [bank, setBank]         = useState(BANKS[0]);

  function buildDetail(): string {
    if (selected === "upi")        return upiId || "UPI";
    if (selected === "card")       return `Card ending ${cardNum.slice(-4) || "****"}`;
    if (selected === "netbanking") return bank;
    return "Cash on Delivery";
  }

  function isValid(): boolean {
    if (selected === "upi")        return upiId.includes("@");
    if (selected === "card")       return cardNum.replace(/\s/g,"").length >= 16 && cardExp.length === 5 && cardCvv.length >= 3;
    return true;
  }

  function formatCard(val: string) {
    return val.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  }
  function formatExp(val: string) {
    return val.replace(/\D/g,"").slice(0,4).replace(/^(\d{2})(\d)/, "$1/$2");
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-bold text-lg">Payment Method</h2>
        <p className="text-muted-foreground text-sm mt-1">All transactions are secured and encrypted</p>
      </div>

      {/* Method selector */}
      <div className="space-y-2">
        {PAYMENT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all",
                selected === opt.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                selected === opt.id ? "border-primary" : "border-muted-foreground"
              )}>
                {selected === opt.id && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                selected === opt.id ? "bg-primary/10" : "bg-muted"
              )}>
                <Icon size={18} className={selected === opt.id ? "text-primary" : "text-muted-foreground"} />
              </div>
              <div>
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail inputs */}
      <div className="rounded-2xl border border-border p-5 bg-muted/20 space-y-4">
        {selected === "upi" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">UPI ID</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              className={cn(
                "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              )}
            />
            <p className="text-xs text-muted-foreground">e.g., arjun@okaxis · 9876543210@paytm</p>
          </div>
        )}

        {selected === "card" && (
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Card Number</label>
              <input
                type="text"
                value={cardNum}
                onChange={(e) => setCardNum(formatCard(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className={cn("h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-mono", "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Expiry</label>
                <input type="text" value={cardExp} onChange={(e) => setCardExp(formatExp(e.target.value))} placeholder="MM/YY" maxLength={5} className={cn("h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-mono", "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">CVV</label>
                <input type="password" value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="•••" maxLength={4} className={cn("h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-mono", "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary")} />
              </div>
            </div>
          </div>
        )}

        {selected === "netbanking" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Select Bank</label>
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className={cn("h-10 w-full rounded-lg border border-border bg-background px-3 text-sm", "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors")}
            >
              {BANKS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        )}

        {selected === "cod" && (
          <p className="text-sm text-muted-foreground">
            Pay in cash when your order is delivered. Available for orders up to ₹50,000.
            A nominal convenience fee of ₹49 applies.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="h-11 px-5 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={() => isValid() && onNext(selected, buildDetail())}
          disabled={!isValid()}
          className={cn(
            "flex-1 h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
            "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          )}
        >
          Review Order <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
