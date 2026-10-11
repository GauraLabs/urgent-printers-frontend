import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { isSafeHref, sanitizeRichText } from "@/lib/sanitize";
import { stripHtml, productDescription } from "@/lib/seo/metadata";

function fragment(html: string): Node {
  const t = document.createElement("template");
  t.innerHTML = html;
  return t.content;
}

describe("sanitizeRichText: XSS payloads", () => {
  it("drops <script> and its body", () => {
    const out = sanitizeRichText("<p>Hi</p><script>alert(1)</script><p>there</p>");
    expect(out).toBe("<p>Hi</p><p>there</p>");
  });

  it("drops <img onerror>", () => {
    expect(sanitizeRichText('<p>a<img src=x onerror="alert(1)">b</p>')).toBe("<p>ab</p>");
  });

  it("strips javascript: hrefs but keeps the link text", () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
  });

  it.each([
    "java&#115;cript:alert(1)",
    "&#106;avascript:alert(1)",
    "javascript&colon;alert(1)",
    "&#x6A;&#x61;vascript:alert(1)",
    "  JaVaScRiPt:alert(1)",
    "java\tscript:alert(1)",
    "java&#09;script:alert(1)",
    "java&#x0A;script:alert(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    "//evil.example/path",
    "/\\evil.example",
  ])("strips dangerous href %j", (href) => {
    const out = sanitizeRichText(`<a href="${href}">x</a>`);
    expect(out).toBe("<a>x</a>");
  });

  it("drops <iframe> and its contents", () => {
    expect(sanitizeRichText('<p>a</p><iframe src="https://evil.example">fallback</iframe><p>b</p>')).toBe("<p>a</p><p>b</p>");
  });

  it("strips style= and event handlers from allowed tags", () => {
    expect(sanitizeRichText('<p style="background:url(javascript:x)" onclick="x()">t</p>')).toBe("<p>t</p>");
  });

  it("drops <svg onload> without losing surrounding text", () => {
    const out = sanitizeRichText('<p>a</p><svg onload="alert(1)"><circle r="1"/></svg><p>b</p>');
    expect(out).not.toMatch(/svg|onload|circle/i);
    expect(out).toContain("<p>a</p>");
    expect(out).toContain("<p>b</p>");
  });

  it("drops other disallowed tags but keeps their safe text", () => {
    expect(sanitizeRichText('<div class="x"><h1>T</h1><span>s</span></div>')).toBe("Ts");
  });

  it("neutralises attribute-breaking and comment tricks", () => {
    const out = sanitizeRichText('<p title="x" id="y">a</p><!-- <script>alert(1)</script> --><a href="/x" onmouseover="alert(1)">l</a>');
    expect(out).toBe('<p>a</p><a href="/x">l</a>');
  });

  it("handles empty/nullish input", () => {
    expect(sanitizeRichText("")).toBe("");
    expect(sanitizeRichText(null)).toBe("");
    expect(sanitizeRichText(undefined)).toBe("");
  });

  it("escapes plain-text descriptions instead of interpreting them", () => {
    expect(sanitizeRichText("Size 5 < 7 & bold")).toBe("Size 5 &lt; 7 &amp; bold");
  });
});

describe("sanitizeRichText: link attributes", () => {
  it("forces rel=noopener noreferrer on target=_blank and keeps existing rel tokens", () => {
    const out = sanitizeRichText('<a href="https://x.example" target="_blank" rel="nofollow">x</a>');
    expect(out).toBe('<a href="https://x.example" target="_blank" rel="nofollow noopener noreferrer">x</a>');
  });

  it("adds rel when target=_blank has none", () => {
    expect(sanitizeRichText('<a href="https://x.example" target="_blank">x</a>')).toBe(
      '<a href="https://x.example" target="_blank" rel="noopener noreferrer">x</a>',
    );
  });

  it("drops non-_blank targets", () => {
    expect(sanitizeRichText('<a href="/p" target="_top">x</a>')).toBe('<a href="/p">x</a>');
  });

  it.each(["https://x.example/a?b=1", "http://x.example", "mailto:a@b.example", "tel:+911234567890", "/products/cards", "#details"])(
    "keeps safe href %j",
    (href) => {
      expect(sanitizeRichText(`<a href="${href}">x</a>`)).toBe(`<a href="${href.replace(/&/g, "&amp;")}">x</a>`);
    },
  );

  it("keeps class on links only", () => {
    expect(sanitizeRichText('<p class="a"><a class="link" href="/x">x</a></p>')).toBe('<p><a href="/x" class="link">x</a></p>');
  });
});

describe("sanitizeRichText: legit TipTap output", () => {
  it("preserves editor HTML unchanged", () => {
    const html =
      "<h2>Premium Wedding Cards</h2>" +
      "<p>Printed on <strong>350 GSM</strong> <em>matte</em> stock with <u>gold</u> <s>silver</s> foil. <b>B</b> <i>I</i></p>" +
      "<ul><li><p>Envelope included</p></li><li><p>Ships in 2 days</p></li></ul>" +
      "<ol><li><p>Pick a size</p></li></ol>" +
      "<h3>Care</h3><blockquote><p>Keep dry.</p></blockquote>" +
      "<pre><code>SKU-123</code></pre><hr>" +
      '<p>Line one<br>Line two <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.urgentprinters.com/faq">FAQ</a></p>';
    // Serialization differs cosmetically (<br />, attribute order); compare as parsed DOM.
    expect(fragment(sanitizeRichText(html)).isEqualNode(fragment(html))).toBe(true);
  });
});

describe("isSafeHref", () => {
  it("rejects schemes hidden by control chars", () => {
    expect(isSafeHref("\u0000javascript:alert(1)")).toBe(false);
    expect(isSafeHref("https://ok.example")).toBe(true);
  });
});

describe("plain-text derivations", () => {
  it("stripHtml removes tags and raw-text element bodies", () => {
    expect(stripHtml("<p>Hello</p><script>alert(1)</script><style>p{}</style><p>world</p>")).toBe("Hello world");
    expect(stripHtml('<img src=x onerror="alert(1)">Nice <!-- <b>hidden</b> --> card')).toBe("Nice card");
  });

  it("meta description fallback has no markup", () => {
    const text = productDescription({
      name: "Card",
      shortDescription: "",
      description: '<p>Great <a href="javascript:x">card</a></p><script>evil()</script>',
      seo: undefined,
    });
    expect(text).toBe("Great card");
  });

  it("the PDP renders the description through sanitizeRichText", () => {
    const src = readFileSync(path.resolve(__dirname, "../app/products/[categorySlug]/[productSlug]/page.tsx"), "utf8");
    expect(src).toContain("__html: sanitizeRichText(product.description)");
    expect(src).not.toMatch(/__html:\s*product\.description/);
  });
});
