/**
 * Canonical cartItemId formula — used in the store, configurator, and server mapper.
 * Every field that makes two orders "different" must appear here.
 * Artwork and template data are included so users can order the same product
 * with different artwork/personalisation as separate cart entries.
 */
export function makeCartItemId(
  productId: string,
  sizeId: string,
  paperId: string,
  finishId: string,
  sides: string,
  turnaroundId: string,
  artworkFileKey?: string,
  templateData?: Record<string, string>
): string {
  const artworkPart = artworkFileKey ?? "";
  // Sort keys so the ID is stable regardless of object insertion order
  const templatePart =
    templateData && Object.keys(templateData).length > 0
      ? Object.entries(templateData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}:${v}`)
          .join("|")
      : "";
  return `${productId}-${sizeId}-${paperId}-${finishId}-${sides}-${turnaroundId}-${artworkPart}-${templatePart}`;
}
