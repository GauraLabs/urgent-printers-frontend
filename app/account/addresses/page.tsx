"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, MapPin, Pencil, Trash2, Star, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/common/FormField";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Address } from "@/types";

// Mock addresses for client-side state
const INITIAL_ADDRESSES: Address[] = [
  { id: "addr-1", userId: "user-me", label: "Home", fullName: "Arjun Sharma", line1: "42, Linking Road", line2: "Bandra West", city: "Mumbai", state: "Maharashtra", postalCode: "400050", country: "India", isDefault: true },
  { id: "addr-2", userId: "user-me", label: "Office", fullName: "Arjun Sharma", line1: "15, Brigade Road", line2: "3rd Floor, Tech Hub", city: "Bengaluru", state: "Karnataka", postalCode: "560001", country: "India", isDefault: false },
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

function AddressForm({ initial, onSave, onCancel }: {
  initial?: Partial<FormValues>;
  onSave: (data: FormValues) => void;
  onCancel: () => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4 p-5 rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Label" placeholder="Home / Office" error={errors.label?.message} {...register("label")} />
        <FormField label="Full name" placeholder="Arjun Sharma" required error={errors.fullName?.message} {...register("fullName")} />
      </div>
      <FormField label="Address line 1" placeholder="Flat / House no., Street" required error={errors.line1?.message} {...register("line1")} />
      <FormField label="Address line 2" placeholder="Area, Landmark (optional)" error={errors.line2?.message} {...register("line2")} />
      <div className="grid grid-cols-3 gap-3">
        <FormField label="City" placeholder="Mumbai" required error={errors.city?.message} {...register("city")} />
        <FormField label="State" placeholder="Maharashtra" required error={errors.state?.message} {...register("state")} />
        <FormField label="PIN Code" placeholder="400050" required error={errors.postalCode?.message} {...register("postalCode")} />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Save Address
        </button>
        <button type="button" onClick={onCancel} className="h-9 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1">
          <X size={14} /> Cancel
        </button>
      </div>
    </form>
  );
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>(INITIAL_ADDRESSES);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleAdd(data: FormValues) {
    const newAddr: Address = { ...data, line2: data.line2 ?? undefined, id: `addr-${Date.now()}`, userId: "user-me", country: "India", isDefault: addresses.length === 0 };
    setAddresses((prev) => [...prev, newAddr]);
    setShowForm(false);
    toast.success("Address added.");
  }

  function handleEdit(id: string, data: FormValues) {
    setAddresses((prev) => prev.map((a) => a.id === id ? { ...a, ...data, line2: data.line2 ?? undefined } : a));
    setEditingId(null);
    toast.success("Address updated.");
  }

  function handleDelete(id: string) {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    toast.success("Address removed.");
  }

  function handleSetDefault(id: string) {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    toast.success("Default address updated.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">Addresses</h1>
          <p className="text-muted-foreground text-sm mt-1">{addresses.length} saved address{addresses.length !== 1 ? "es" : ""}</p>
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

      <div className="flex flex-col gap-4">
        {addresses.map((addr) => (
          <div key={addr.id}>
            {editingId === addr.id ? (
              <AddressForm
                initial={{ label: addr.label, fullName: addr.fullName, line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state, postalCode: addr.postalCode }}
                onSave={(data) => handleEdit(addr.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className={cn("p-5 rounded-2xl border bg-card", addr.isDefault ? "border-primary/40 ring-1 ring-primary/20" : "border-border")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
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
                    <button onClick={() => { setEditingId(addr.id); setShowForm(false); }} aria-label="Edit address" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(addr.id)} aria-label="Delete address" className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mt-3 leading-relaxed pl-5">
                  <p className="text-foreground font-medium">{addr.fullName}</p>
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
