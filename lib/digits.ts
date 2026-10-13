// Devanagari (U+0966-096F) and fullwidth (U+FF10-FF19) digits to ASCII, so Indian-keyboard and CJK-IME input works.
export function toAsciiDigits(text: string): string {
  return text.replace(/[०-९０-９]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return String(code >= 0xff10 ? code - 0xff10 : code - 0x0966);
  });
}

// A lone comma followed by 1-2 digits ("12,5", "7,25") is a decimal comma. "10,000" and "1,00,000" are Indian/western
// digit grouping (3 digits after the last comma, or several commas), so they stay whole numbers.
export function normalizeDecimalComma(text: string): string {
  const compact = text.replace(/\s/g, "");
  return /^\d+,\d{1,2}$/.test(compact) ? compact.replace(",", ".") : text;
}
