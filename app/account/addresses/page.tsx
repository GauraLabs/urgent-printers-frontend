"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, MapPin, Pencil, Trash2, Star, Loader2, X,
  LocateFixed, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/common/FormField";
import { useAuthStore } from "@/features/auth/store";
import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from "@/lib/api";
import { getCurrentPosition, reverseGeocode } from "@/lib/geolocation";
import { lookupPincode } from "@/lib/pincode";
import { cn } from "@/lib/utils";
import type { Address } from "@/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  label:      z.string().min(1, "Label required"),
  fullName:   z.string().min(2, "Full name required"),
  phone:      z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  line1:      z.string().min(3, "Address required"),
  line2:      z.string().optional(),
  postalCode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),
  city:       z.string().min(2, "City required"),
  state:      z.string().min(2, "State required"),
});
type FormValues = z.infer<typeof schema>;

type PincodeStatus = "idle" | "loading" | "valid" | "invalid";

// ─── Address form ─────────────────────────────────────────────────────────────

function AddressForm({ initial, onSave, onCancel }: {
  initial?: Partial<FormValues>;
  onSave: (data: FormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [detecting,     setDetecting]     = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState<PincodeStatus>("idle");

  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });

  // ── PIN code auto-fill ──────────────────────────────────────────────────────
  const postalCode = useWatch({ control, name: "postalCode" });

  useEffect(() => {
    if (!postalCode || postalCode.length !== 6) {
      setPincodeStatus("idle");
      return;
    }
    setPincodeStatus("loading");
    const timer = setTimeout(async () => {
      const info = await lookupPincode(postalCode);
      if (info) {
        setValue("state", info.state, { shouldValidate: true });
        setValue("city",  info.city,  { shouldValidate: true });
        setPincodeStatus("valid");
      } else {
        setPincodeStatus("invalid");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [postalCode, setValue]);

  // ── GPS location detect ─────────────────────────────────────────────────────
  async function handleDetectLocation() {
    setDetecting(true);
    try {
      const pos  = await getCurrentPosition();
      const addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      if (addr.line1)      setValue("line1",      addr.line1,      { shouldValidate: true });
      if (addr.line2)      setValue("line2",      addr.line2);
      if (addr.postalCode) setValue("postalCode", addr.postalCode, { shouldValidate: true });
      if (addr.city)       setValue("city",       addr.city,       { shouldValidate: true });
      if (addr.state)      setValue("state",      addr.state,      { shouldValidate: true });
      toast.success("Location detected — please review and confirm.");
    } catch (err) {
      const isGeoError = err instanceof GeolocationPositionError;
      toast.error(
        isGeoError && err.code === 1 ? "Location permission denied. Please allow access." :
        isGeoError && err.code === 2 ? "Location unavailable. Please enter manually." :
        "Could not detect location. Please enter manually."
      );
    } finally {
      setDetecting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4 p-5 rounded-2xl border border-border bg-card">

      {/* Detect location */}
      <button
        type="button"
        onClick={handleDetectLocation}
        disabled={detecting}
        className={cn(
          "w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-dashed text-sm font-medium transition-all",
          "border-primary/40 text-primary hover:bg-primary/5 disabled:opacity-60 disabled:cursor-not-allowed"
        )}
      >
        {detecting
          ? <><Loader2 size={14} className="animate-spin" /> Detecting location…</>
          : <><LocateFixed size={14} /> Use my current location</>}
      </button>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[11px] text-muted-foreground shrink-0">or enter manually</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Label + Full name */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Label" placeholder="Home / Office" error={errors.label?.message} {...register("label")} />
        <FormField label="Full name" placeholder="Arjun Sharma" required error={errors.fullName?.message} {...register("fullName")} />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Contact number <span className="text-destructive">*</span>
        </label>
        <div className={cn(
          "flex rounded-xl border overflow-hidden transition-colors",
          "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
          errors.phone ? "border-destructive" : "border-border"
        )}>
          <span className="flex items-center px-3 bg-muted text-muted-foreground text-sm font-medium border-r border-border shrink-0">
            +91
          </span>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel-national"
            placeholder="98765 43210"
            className="flex-1 px-3 py-2.5 text-sm bg-background focus:outline-none"
            {...register("phone")}
          />
        </div>
        {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone.message}</p>}
        <p className="text-[11px] text-muted-foreground mt-1">Courier will call this number for delivery</p>
      </div>

      {/* Address lines */}
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
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="400050"
              className={cn(
                "w-full rounded-xl border px-3 py-2.5 text-sm bg-background pr-8",
                "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors",
                errors.postalCode ? "border-destructive" : "border-border hover:border-primary/40"
              )}
              {...register("postalCode")}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {pincodeStatus === "loading" && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
              {pincodeStatus === "valid"   && <CheckCircle2 size={14} className="text-success" />}
              {pincodeStatus === "invalid" && <XCircle      size={14} className="text-destructive" />}
            </div>
          </div>
          {errors.postalCode && <p className="text-destructive text-xs mt-1">{errors.postalCode.message}</p>}
          {pincodeStatus === "invalid" && !errors.postalCode && (
            <p className="text-destructive text-xs mt-1">PIN code not found</p>
          )}
        </div>

        <FormField
          label="City"
          placeholder="Auto-filled"
          required
          error={errors.city?.message}
          {...register("city")}
        />
        <FormField
          label="State"
          placeholder="Auto-filled"
          required
          error={errors.state?.message}
          {...register("state")}
        />
      </div>

      {pincodeStatus === "valid" && (
        <p className="text-[11px] text-success flex items-center gap-1">
          <CheckCircle2 size={11} /> PIN code verified — city and state auto-filled
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Save Address
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1"
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddressesPage() {
  const user  = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [addresses,  setAddresses]  = useState<Address[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user) return;
    getAddresses(user.id, token)
      .then(setAddresses)
      .catch(() => toast.error("Failed to load addresses"))
      .finally(() => setLoading(false));
  }, [token, user]);

  async function handleAdd(data: FormValues) {
    if (!token || !user) return;
    const created = await createAddress(
      user.id,
      { ...data, line2: data.line2 || undefined, country: "India", isDefault: addresses.length === 0 },
      token
    );
    setAddresses((prev) => [...prev, created]);
    setShowForm(false);
    toast.success("Address added.");
  }

  async function handleEdit(id: string, data: FormValues) {
    if (!token) return;
    const updated = await updateAddress(id, { ...data, line2: data.line2 || undefined }, token);
    setAddresses((prev) => prev.map((a) => a.id === id ? updated : a));
    setEditingId(null);
    toast.success("Address updated.");
  }

  async function handleDelete(id: string) {
    if (!token) return;
    setDeletingId(id);
    try {
      await deleteAddress(id, token);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success("Address removed.");
    } catch {
      toast.error("Failed to delete address.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetDefault(id: string) {
    if (!token) return;
    try {
      await setDefaultAddress(id, token);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
      toast.success("Default address updated.");
    } catch {
      toast.error("Failed to update default address.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={26} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Addresses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {addresses.length} saved address{addresses.length !== 1 ? "es" : ""}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); }}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-colors"
          >
            <Plus size={15} /> Add Address
          </button>
        )}
      </div>

      {showForm && (
        <AddressForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
      )}

      {addresses.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <MapPin size={32} className="text-muted-foreground/40" />
          <p className="font-semibold text-muted-foreground">No saved addresses</p>
          <p className="text-sm text-muted-foreground/60">Add an address to speed up checkout</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} /> Add Address
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {addresses.map((addr) => (
          <div key={addr.id}>
            {editingId === addr.id ? (
              <AddressForm
                initial={{
                  label: addr.label, fullName: addr.fullName, phone: addr.phone,
                  line1: addr.line1, line2: addr.line2, city: addr.city,
                  state: addr.state, postalCode: addr.postalCode,
                }}
                onSave={(data) => handleEdit(addr.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className={cn("p-5 rounded-2xl border bg-card", addr.isDefault ? "border-primary/40 ring-1 ring-primary/20" : "border-border")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MapPin size={15} className="text-primary shrink-0 mt-0.5" />
                    <p className="font-semibold text-sm">{addr.label}</p>
                    {addr.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                        <Star size={9} className="fill-primary" /> Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!addr.isDefault && (
                      <button onClick={() => handleSetDefault(addr.id)} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        Set default
                      </button>
                    )}
                    <button onClick={() => { setEditingId(addr.id); setShowForm(false); }} aria-label="Edit" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      disabled={deletingId === addr.id}
                      aria-label="Delete"
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      {deletingId === addr.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mt-3 leading-relaxed pl-5">
                  <p className="text-foreground font-medium">{addr.fullName}</p>
                  <p className="text-foreground/70 text-xs">{addr.phone}</p>
                  <p>{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                  <p>{addr.city}, {addr.state} — {addr.postalCode}</p>
                  <p>{addr.country}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
