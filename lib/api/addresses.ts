import type { Address } from "@/types";
import { apiFetch } from "./client";

const BASE = "/addresses";

// ─── Backend shape (snake_case) ───────────────────────────────────────────────

interface BackendAddress {
  id: number;
  label: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

function mapAddress(a: BackendAddress): Address {
  return {
    id: String(a.id),
    userId: "",
    label: a.label,
    fullName: a.full_name,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 ?? undefined,
    city: a.city,
    state: a.state,
    postalCode: a.postal_code,
    country: a.country,
    isDefault: a.is_default,
  };
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getAddresses(_userId: string, token: string): Promise<Address[]> {
  // REAL API: GET /api/v1/addresses
  const data = await apiFetch<BackendAddress[]>(BASE, {
    headers: authHeader(token),
  });
  return data.map(mapAddress);
}

export async function createAddress(
  _userId: string,
  data: Omit<Address, "id" | "userId">,
  token: string
): Promise<Address> {
  // REAL API: POST /api/v1/addresses
  const res = await apiFetch<BackendAddress>(BASE, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({
      label: data.label,
      full_name: data.fullName,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2 ?? null,
      city: data.city,
      state: data.state,
      postal_code: data.postalCode,
      country: data.country ?? "India",
      is_default: data.isDefault,
    }),
  });
  return mapAddress(res);
}

export async function updateAddress(
  addressId: string,
  data: Partial<Omit<Address, "id" | "userId">>,
  token: string
): Promise<Address> {
  // REAL API: PATCH /api/v1/addresses/{id}
  const body: Record<string, unknown> = {};
  if (data.label !== undefined) body.label = data.label;
  if (data.fullName !== undefined) body.full_name = data.fullName;
  if (data.phone !== undefined) body.phone = data.phone;
  if (data.line1 !== undefined) body.line1 = data.line1;
  if (data.line2 !== undefined) body.line2 = data.line2 ?? null;
  if (data.city !== undefined) body.city = data.city;
  if (data.state !== undefined) body.state = data.state;
  if (data.postalCode !== undefined) body.postal_code = data.postalCode;
  if (data.country !== undefined) body.country = data.country;
  if (data.isDefault !== undefined) body.is_default = data.isDefault;

  const res = await apiFetch<BackendAddress>(`${BASE}/${addressId}`, {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify(body),
  });
  return mapAddress(res);
}

export async function deleteAddress(addressId: string, token: string): Promise<void> {
  // REAL API: DELETE /api/v1/addresses/{id}
  await apiFetch<void>(`${BASE}/${addressId}`, {
    method: "DELETE",
    headers: authHeader(token),
  });
}

export async function setDefaultAddress(addressId: string, token: string): Promise<Address> {
  // REAL API: PATCH /api/v1/addresses/{id}/default
  const res = await apiFetch<BackendAddress>(`${BASE}/${addressId}/default`, {
    method: "PATCH",
    headers: authHeader(token),
  });
  return mapAddress(res);
}
