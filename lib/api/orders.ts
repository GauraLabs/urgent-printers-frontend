import type { Order } from "@/types";
import { mockOrders } from "@/lib/mock-data";
import { delay } from "./delay";

// ─── Real API: replace the body of each function with a fetch() call ─────────

export async function getOrders(userId: string): Promise<Order[]> {
  // REAL API: return fetch(`/api/users/${userId}/orders`).then(r => r.json())
  await delay(500);
  return mockOrders.filter((o) => o.userId === userId || userId === "user-me");
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  // REAL API: return fetch(`/api/orders/${orderId}`).then(r => r.json())
  await delay(400);
  return mockOrders.find((o) => o.id === orderId) ?? null;
}

export async function getOrderByNumber(
  orderNumber: string
): Promise<Order | null> {
  // REAL API: return fetch(`/api/orders?number=${orderNumber}`).then(r => r.json())
  await delay(400);
  return mockOrders.find((o) => o.orderNumber === orderNumber) ?? null;
}
