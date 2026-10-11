import sanitizeHtml from "sanitize-html";

// Mirrors the backend write-side allowlist (urgent-printers-backend/app/services/html_allowlist.py),
// which matches what the admin panel's TipTap editor emits. Applied again on render because
// rows written before that check existed, or via any other path, are not guaranteed clean.
const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "s", "code", "pre", "blockquote", "ul", "ol", "li", "h2", "h3", "hr", "a"];

const SAFE_SCHEMES = ["https:", "http:", "mailto:", "tel:"];

// Contents are dropped with the tag rather than kept as escaped text.
const NON_TEXT_TAGS = ["script", "style", "textarea", "option", "noscript", "iframe", "noembed", "noframes", "template", "xmp", "title"];

// Browsers ignore ASCII control chars and whitespace inside a URL scheme ("java\tscript:").
const URL_JUNK_RE = /[\x00-\x20\x7f]+/g;

export function isSafeHref(raw: string): boolean {
  const href = raw.replace(URL_JUNK_RE, "").toLowerCase();
  if (href.startsWith("/")) return !href.startsWith("//") && !href.startsWith("/\\");
  if (href.startsWith("#")) return true;
  return SAFE_SCHEMES.some((scheme) => href.startsWith(scheme));
}

function transformLink(tagName: string, attribs: sanitizeHtml.Attributes): sanitizeHtml.Tag {
  const out: sanitizeHtml.Attributes = {};
  // htmlparser2 has already decoded entities here, so "java&#115;cript:" arrives as "javascript:".
  if (attribs.href !== undefined && isSafeHref(attribs.href)) out.href = attribs.href;
  if (attribs.class) out.class = attribs.class;
  const rel = new Set((attribs.rel ?? "").split(/\s+/).filter(Boolean));
  if (attribs.target === "_blank") {
    out.target = "_blank";
    rel.add("noopener");
    rel.add("noreferrer");
  }
  if (rel.size > 0) out.rel = [...rel].join(" ");
  return { tagName, attribs: out };
}

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: { a: ["href", "target", "rel", "class"] },
  allowedSchemes: SAFE_SCHEMES.map((s) => s.slice(0, -1)),
  allowedSchemesByTag: {},
  allowProtocolRelative: false,
  allowedStyles: {},
  disallowedTagsMode: "discard",
  nonTextTags: NON_TEXT_TAGS,
  transformTags: { a: transformLink },
};

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}
