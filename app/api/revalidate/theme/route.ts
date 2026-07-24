import { timingSafeEqual, createHash } from "crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

// timingSafeEqual throws on length-mismatched buffers, and comparing raw
// secret lengths before that would itself leak timing info. Hashing both
// sides to a fixed-length digest first sidesteps both problems.
function safeCompare(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientIp = getClientIp(request.headers);
  const { allowed } = checkRateLimit(`revalidate-theme:${clientIp}`, RATE_LIMIT, RATE_LIMIT_WINDOW_MS);

  if (!allowed) {
    return NextResponse.json({ message: "Too many requests" }, { status: 429 });
  }

  const secret = request.headers.get("X-Revalidate-Secret");
  const expected = process.env.REVALIDATE_SECRET;

  if (!expected || !secret || !safeCompare(secret, expected)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Third-party webhook triggering this — needs the tag to expire
  // immediately, not the stale-while-revalidate default.
  revalidateTag("site-theme", { expire: 0 });

  return NextResponse.json({ revalidated: true });
}
