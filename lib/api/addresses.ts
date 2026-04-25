import type { Address } from "@/types";
import { delay } from "./delay";

// ─── Real API: replace the body of each function with a fetch() call ─────────

const mockAddresses: Address[] = [
  {
    id: "addr-1",
    userId: "user-me",
    label: "Home",
    fullName: "Arjun Sharma",
    line1: "42, Linking Road",
    line2: "Bandra West",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400050",
    country: "India",
    isDefault: true,
  },
  {
    id: "addr-2",
    userId: "user-me",
    label: "Office",
    fullName: "Arjun Sharma",
    line1: "15, Brigade Road",
    line2: "3rd Floor, Tech Hub",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560001",
    country: "India",
    isDefault: false,
  },
];

export async function getAddresses(userId: string): Promise<Address[]> {
  // REAL API: return fetch(`/api/users/${userId}/addresses`).then(r => r.json())
  await delay(400);
  return mockAddresses.filter((a) => a.userId === userId || userId === "user-me");
}

export async function createAddress(
  userId: string,
  data: Omit<Address, "id" | "userId">
): Promise<Address> {
  // REAL API: return fetch(`/api/users/${userId}/addresses`, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json())
  await delay(600);
  return { ...data, id: `addr-${Date.now()}`, userId };
}

export async function updateAddress(
  addressId: string,
  data: Partial<Omit<Address, "id" | "userId">>
): Promise<Address> {
  // REAL API: return fetch(`/api/addresses/${addressId}`, { method: 'PATCH', body: JSON.stringify(data) }).then(r => r.json())
  await delay(500);
  const existing = mockAddresses.find((a) => a.id === addressId);
  if (!existing) throw new Error("Address not found");
  return { ...existing, ...data };
}

export async function deleteAddress(addressId: string): Promise<void> {
  // REAL API: return fetch(`/api/addresses/${addressId}`, { method: 'DELETE' }).then(r => r.json())
  await delay(400);
}
