import { ApiError } from "./client";

export type PersonalisationCode =
  | "personalisation_required"
  | "personalisation_too_long"
  | "personalisation_invalid"
  | "invalid_artwork";

const CODES: ReadonlySet<string> = new Set<PersonalisationCode>([
  "personalisation_required",
  "personalisation_too_long",
  "personalisation_invalid",
  "invalid_artwork",
]);

export const INVALID_ARTWORK_MESSAGE = "Your uploaded design couldn't be found — please re-upload it on the product page.";

export interface PersonalisationField {
  id: string;
  label: string;
  maxLength?: number;
}

export interface PersonalisationError {
  code: PersonalisationCode;
  message: string;
  fields: PersonalisationField[];
  productId?: string;
}

function parseFields(raw: unknown): PersonalisationField[] {
  if (!Array.isArray(raw)) return [];
  const out: PersonalisationField[] = [];
  for (const f of raw) {
    if (!f || typeof f !== "object") continue;
    const { id, label, max_length } = f as Record<string, unknown>;
    if (typeof id !== "string") continue;
    out.push({
      id,
      label: typeof label === "string" && label ? label : id,
      ...(typeof max_length === "number" && { maxLength: max_length }),
    });
  }
  return out;
}

// POST /orders and /orders/preview answer 422 with a top-level `error` of personalisation_required,
// personalisation_too_long, personalisation_invalid (bad url/email/phone format) or invalid_artwork (no fields), plus `fields` and `product_id`. Schema-bound violations come back as
// FastAPI's generic {"detail": [...]} 422, which is NOT matched here and gets the generic message.
export function getPersonalisationError(err: unknown): PersonalisationError | null {
  if (!(err instanceof ApiError) || err.status !== 422) return null;
  if (!err.code || !CODES.has(err.code)) return null;
  const body = (err.body && typeof err.body === "object" ? err.body : {}) as Record<string, unknown>;
  const productId = body.product_id;
  const code = err.code as PersonalisationCode;
  const fields = parseFields(body.fields);
  const message =
    code === "invalid_artwork"
      ? INVALID_ARTWORK_MESSAGE
      : code === "personalisation_invalid" && !err.message
        ? `Please check the format of: ${fields.map((f) => f.label).join(", ")}`
        : err.message;
  return {
    code,
    message,
    fields,
    productId: productId != null ? String(productId) : undefined,
  };
}
