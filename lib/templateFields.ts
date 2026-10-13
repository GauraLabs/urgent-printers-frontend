import type { TemplateField } from "@/types";

// Applied when the admin left max_length empty, so a personalisation input can't take unbounded text.
export const DEFAULT_TEMPLATE_FIELD_MAX_LENGTH = 100;

// The server hard-caps multiline fields at 500 characters.
export const MULTILINE_FIELD_MAX_LENGTH = 500;

export function fieldMaxLength(field: Pick<TemplateField, "maxLength" | "type">): number {
  const cap = field.maxLength && field.maxLength > 0 ? field.maxLength : DEFAULT_TEMPLATE_FIELD_MAX_LENGTH;
  return field.type === "multiline" ? Math.min(cap, MULTILINE_FIELD_MAX_LENGTH) : cap;
}

export function trimTemplateData(data: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!data) return data;
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.trim()]));
}
