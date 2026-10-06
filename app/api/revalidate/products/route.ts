import { timingSafeEqual, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { planProductRevalidation } from "@/lib/revalidate-products";

const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

// Hashing both sides to a fixed-length digest first avoids timingSafeEqual's
// length-mismatch throw without leaking the secret's length (same as site-status).
function safeCompare(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientIp = getClientIp(request.headers);
  const { allowed } = checkRateLimit(`revalidate-products:${clientIp}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);

  if (!allowed) {
    return NextResponse.json({ message: "Too many requests" }, { status: 429 });
  }

  const secret = request.headers.get("X-Revalidate-Secret");
  const expected = process.env.REVALIDATE_SECRET;

  if (!expected || !secret || !safeCompare(secret, expected)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const plan = planProductRevalidation(body);
  if (!plan.ok) {
    return NextResponse.json({ message: plan.error }, { status: 400 });
  }

  // Product fetches carry no cache tags — freshness comes from page-level
  // `revalidate = 60` — so this must invalidate by path, not by tag.
  if (plan.all) {
    revalidatePath("/", "layout");
    return NextResponse.json({ revalidated: true, all: true });
  }

  for (const path of plan.paths) revalidatePath(path);
  return NextResponse.json({ revalidated: true, paths: plan.paths.length });
}
