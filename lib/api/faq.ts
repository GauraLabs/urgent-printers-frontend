import type { Faq } from "@/types";
import { delay } from "./delay";
import { apiFetch } from "./client";

// ─── Backend shapes ───────────────────────────────────────────────────────────

interface BackendFaq {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

function mapFaq(f: BackendFaq): Faq {
  return {
    id: String(f.id),
    question: f.question,
    answer: f.answer,
    category: f.category,
  };
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getFaqs(): Promise<Faq[]> {
  // REAL API: GET /api/v1/content/faqs — already ordered by sort_order, active only
  if (!process.env.NEXT_PUBLIC_API_URL) {
    await delay(300);
    return [];
  }
  try {
    const data = await apiFetch<BackendFaq[]>("/content/faqs");
    return data.map(mapFaq);
  } catch {
    return [];
  }
}
