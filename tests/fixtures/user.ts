import type { User } from "@/types";

export function mapUserForTest(over: Partial<User>): User {
  return { id: "1", email: "a@b.com", firstName: "A", lastName: "B", createdAt: "2026-01-01T00:00:00Z", ...over };
}
