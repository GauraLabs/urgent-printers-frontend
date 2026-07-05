"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/common/FormField";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/store";
import { updateProfile } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

const schema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName:  z.string().min(1, "Last name required"),
  email:     z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone:     z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number").optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const token = useAuthStore((s) => s.token);

  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName:  user?.lastName  ?? "",
      email:     user?.email     ?? "",
      phone:     user?.phone?.replace("+91 ", "") ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    if (!token) return;
    try {
      const updated = await updateProfile(token, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
      });
      setUser({ ...updated, phone: user?.phone }, token);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-heading font-bold text-2xl">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your personal information</p>
      </div>

      {/* Avatar placeholder */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center font-heading font-bold text-primary text-xl shrink-0">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "—"}
          </p>
        </div>
      </div>

      <Separator />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First name" required error={errors.firstName?.message} {...register("firstName")} />
          <FormField label="Last name"  required error={errors.lastName?.message}  {...register("lastName")}  />
        </div>
        <FormField label="Email address" type="email" error={errors.email?.message} hint="Used for order notifications and receipts." {...register("email")} />
        <FormField label="Mobile number" type="tel" placeholder="9876543210" hint="10-digit Indian mobile number" error={errors.phone?.message} {...register("phone")} />

        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className={cn(
            "flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold",
            "bg-brand-orange hover:bg-brand-orange/90 text-brand-orange-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          )}
        >
          {isSubmitting && <Loader2 size={15} className="animate-spin" />}
          Save Changes
        </button>
      </form>

      <Separator />

      {/* Danger zone */}
      <div className="space-y-3">
        <p className="font-heading font-semibold text-sm text-destructive">Danger Zone</p>
        <p className="text-xs text-muted-foreground">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button className="h-9 px-4 rounded-xl text-sm font-medium border border-destructive/40 text-destructive hover:bg-destructive/5 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  );
}
