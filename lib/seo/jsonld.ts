// Escaped by code point so no raw U+2028/2029 ever sits in this source file.
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LINE_SEP]: "\\u2028",
  [PARA_SEP]: "\\u2029",
};

const UNSAFE = new RegExp(`[<>&${LINE_SEP}${PARA_SEP}]`, "g");

/**
 * The only way JSON-LD may reach a <script> tag. JSON.stringify leaves "</script>"
 * intact, so any user/admin-authored string (FAQ answer, product name) could
 * close the tag and inject markup. The escapes are still valid JSON.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(UNSAFE, (ch) => ESCAPES[ch]);
}
