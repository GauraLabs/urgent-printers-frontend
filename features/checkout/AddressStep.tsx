"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Plus, ArrowRight, Star } from "lucide-react";
import { FormField } from "@/components/common/FormField";
import { cn } from "@/lib/utils";
import type { Address } from "@/types";

const SAVED_ADDRESSES: Address[] = [
  { id: "addr-1", userId: "user-me", label: "Home",   fullName: "Arjun Sharma", line1: "42, Linking Road",  line2: "Bandra West",       city: "Mumbai",    state: "Maharashtra", postalCode: "400050", country: "India", isDefault: true  },
  { id: "addr-2", userId: "user-me", label: "Office", fullName: "Arjun Sharma", line1: "15, Brigade Road", line2: "3rd Floor, Tech Hub", city: "Bengaluru", state: "Karnataka",   postalCode: "560001", country: "India", isDefault: false },
];

const schema = z.object({
  label:      z.string().min(1, "Label required"),
  fullName:   z.string().min(2, "Full name required"),
  line1:      z.string().min(5, "Address required"),
  line2:      z.string().optional(),
  city:       z.string().min(2, "City required"),
  state:      z.string().min(2, "State required"),
  postalCode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),
});
type FormValues = z.infer<typeof schema>;

interface AddressStepProps {
  onNext: (address: Omit<Address, "id" | "userId" | "isDefault">) => void;
}

export function AddressStep({ onNext }: AddressStepProps) {
  const [selectedId, setSelectedId] = useState<string>(SAVED_ADDRESSES.find(a => a.isDefault)?.id ?? "");
  const [showNew, setShowNew] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function handleContinueWithSaved() {
    const addr = SAVED_ADDRESSES.find(a => a.id === selectedId);
    if (!addr) return;
    const { id, userId, isDefault, ...rest } = addr;
    onNext(rest);
  }

  function handleNewAddress(data: FormValues) {
    onNext({ ...data, line2: data.line2 ?? undefined, country: "India" });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-bold text-lg">Delivery Address</h2>
        <p className="text-muted-foreground text-sm mt-1">Where should we deliver your prints?</p>
      </div>

      {/* Saved addresses */}
      {!showNew && (
        <div className="space-y-3">
          {SAVED_ADDRESSES.map((addr) => (
            <button
              key={addr.id}
              onClick={() => setSelectedId(addr.id)}
              className={cn(
                "w-full flex gap-4 p-4 rounded-2xl border text-left transition-all",
                selectedId === addr.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center",
                selectedId === addr.id ? "border-primary" : "border-muted-foreground"
              )}>
                {selectedId === addr.id && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">{addr.label}</p>
                  {addr.isDefault && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-0.5">
                      <Star size={8} className="fill-primary" /> Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {addr.fullName} · {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""},{" "}
                  {addr.city}, {addr.state} — {addr.postalCode}
                </p>
              </div>
            </button>
          ))}

          <button
            onClick={() => setShowNew(true)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-all text-sm text-muted-foreground"
          >
            <Plus size={16} className="text-primary" />
            Add a new address
          </button>

          <button
            onClick={handleContinueWithSaved}
            disabled={!selectedId}
            className={cn(
              "w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-2",
              "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            )}
          >
            Continue to Payment <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* New address form */}
      {showNew && (
        <form onSubmit={handleSubmit(handleNewAddress)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Label" placeholder="Home / Office" error={errors.label?.message} {...register("label")} />
            <FormField label="Full name" required error={errors.fullName?.message} {...register("fullName")} />
          </div>
          <FormField label="Address line 1" placeholder="Flat / House no., Street" required error={errors.line1?.message} {...register("line1")} />
          <FormField label="Address line 2" placeholder="Area, Landmark (optional)" error={errors.line2?.message} {...register("line2")} />
          <div className="grid grid-cols-3 gap-3">
            <FormField label="City" placeholder="Mumbai" required error={errors.city?.message} {...register("city")} />
            <FormField label="State" placeholder="Maharashtra" required error={errors.state?.message} {...register("state")} />
            <FormField label="PIN Code" placeholder="400050" required error={errors.postalCode?.message} {...register("postalCode")} />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className={cn(
                "flex-1 h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
                "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground transition-all"
              )}
            >
              Use This Address <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="h-11 px-4 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
