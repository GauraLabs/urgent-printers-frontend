"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MapPin, Plus, ArrowRight, ArrowLeft, Star, Loader2,
  CheckCircle2, XCircle, X,
} from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { toast } from "sonner";
import { FormField } from "@/components/common/FormField";
import { SelectableCard } from "@/components/ui/selectable-card";
import { useAuthStore } from "@/features/auth/store";
import { getAddresses, createAddress } from "@/lib/api";
import { lookupPincode } from "@/lib/pincode";
import { cn } from "@/lib/utils";
import type { Address } from "@/types";

// ─── New address inline form ──────────────────────────────────────────────────

const schema = z.object({
  label:      z.string().min(1, "Label required"),
  fullName:   z.string().min(2, "Full name required"),
  phone:      z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  line1:      z.string().min(5, "Address required"),
  line2:      z.string().optional(),
  postalCode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),
  city:       z.string().min(2, "City required"),
  state:      z.string().min(2, "State required"),
});
type FormValues = z.infer<typeof schema>;

type PincodeStatus = "idle" | "loading" | "valid" | "invalid";

function NewAddressForm({
  onSave,
  onCancel,
  token,
  userId,
}: {
  onSave: (addr: Address) => void;
  onCancel: () => void;
  token: string;
  userId: string;
}) {
  const [pincodeStatus, setPincodeStatus] = useState<PincodeStatus>("idle");

  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  const postalCode = useWatch({ control, name: "postalCode" });

  useEffect(() => {
    if (!postalCode || postalCode.length !== 6) { setPincodeStatus("idle"); return; }
    setPincodeStatus("loading");
    const t = setTimeout(async () => {
      const info = await lookupPincode(postalCode);
      if (info) {
        setValue("state", info.state, { shouldValidate: true });
        setValue("city",  info.city,  { shouldValidate: true });
        setPincodeStatus("valid");
      } else {
        setPincodeStatus("invalid");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [postalCode, setValue]);

  async function onSubmit(data: FormValues) {
    try {
      const created = await createAddress(
        userId,
        { ...data, line2: data.line2 || undefined, country: "India", isDefault: false },
        token
      );
      onSave(created);
      toast.success("Address saved.");
    } catch {
      toast.error("Failed to save address. Please try again.");
    }
  }

  const inputBase = cn(
    "w-full rounded-xl border px-3 py-2.5 text-sm bg-background",
    "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Label" placeholder="Home / Office" error={errors.label?.message} {...register("label")} />
        <FormField label="Full name" required error={errors.fullName?.message} {...register("fullName")} />
      </div>

      <FormField
        label="Mobile number" type="tel" placeholder="9876543210" required
        error={errors.phone?.message} hint="Courier will call for delivery"
        {...register("phone")}
      />

      <FormField label="Address line 1" placeholder="Flat / House no., Street" required error={errors.line1?.message} {...register("line1")} />
      <FormField label="Address line 2" placeholder="Area, Landmark (optional)" error={errors.line2?.message} {...register("line2")} />

      {/* PIN → auto-fills city + state */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            PIN Code <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              type="text" inputMode="numeric" maxLength={6} placeholder="400050"
              className={cn(inputBase, "pr-8", errors.postalCode ? "border-destructive" : "border-border hover:border-primary/40")}
              {...register("postalCode")}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {pincodeStatus === "loading" && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
              {pincodeStatus === "valid"   && <CheckCircle2 size={13} className="text-success" />}
              {pincodeStatus === "invalid" && <XCircle      size={13} className="text-destructive" />}
            </div>
          </div>
          {errors.postalCode && <p className="text-destructive text-xs mt-1">{errors.postalCode.message}</p>}
        </div>
        <FormField label="City" placeholder="Auto-filled" required error={errors.city?.message} {...register("city")} />
        <FormField label="State" placeholder="Auto-filled" required error={errors.state?.message} {...register("state")} />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit" disabled={isSubmitting}
          className={cn(
            "flex-1 h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2",
            "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
            "disabled:opacity-60 transition-all"
          )}
        >
          {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <><ArrowRight size={15} /> Use This Address</>}
        </button>
        <button
          type="button" onClick={onCancel}
          className="h-10 px-4 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors flex items-center gap-1"
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Address step ─────────────────────────────────────────────────────────────

interface AddressStepProps {
  onNext: (address: Omit<Address, "id" | "userId" | "isDefault">) => void;
}

export function AddressStep({ onNext }: AddressStepProps) {
  const user  = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [addresses,  setAddresses]  = useState<Address[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [showNew,    setShowNew]    = useState(false);

  useEffect(() => {
    if (!token || !user) return;
    getAddresses(user.id, token)
      .then((data) => {
        setAddresses(data);
        const def = data.find((a) => a.isDefault) ?? data[0];
        if (def) setSelectedId(def.id);
        if (data.length === 0) setShowNew(true);
      })
      .catch(() => toast.error("Failed to load addresses"))
      .finally(() => setLoading(false));
  }, [token, user]);

  function handleContinueWithSaved() {
    const addr = addresses.find((a) => a.id === selectedId);
    if (!addr) return;
    const { id, userId, isDefault, ...rest } = addr;
    onNext(rest);
  }

  function handleNewAddressSaved(addr: Address) {
    setAddresses((prev) => [...prev, addr]);
    setSelectedId(addr.id);
    setShowNew(false);
    // Proceed immediately with the new address
    const { id, userId, isDefault, ...rest } = addr;
    onNext(rest);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-lg">Delivery Address</h2>
          <p className="text-muted-foreground text-sm mt-1">Where should we deliver your prints?</p>
        </div>
        <Link
          href={ROUTES.cart}
          className="shrink-0 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to Cart
        </Link>
      </div>

      {!showNew && (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <SelectableCard
              key={addr.id}
              selected={selectedId === addr.id}
              onClick={() => setSelectedId(addr.id)}
              className="w-full flex gap-4 p-4"
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
                  <span className="text-foreground/80">{addr.fullName}</span>
                  {" · "}{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""},
                  {" "}{addr.city}, {addr.state} — {addr.postalCode}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{addr.phone}</p>
              </div>
            </SelectableCard>
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

      {showNew && token && user && (
        <NewAddressForm
          onSave={handleNewAddressSaved}
          onCancel={() => { setShowNew(false); if (addresses.length === 0) return; }}
          token={token}
          userId={user.id}
        />
      )}
    </div>
  );
}
