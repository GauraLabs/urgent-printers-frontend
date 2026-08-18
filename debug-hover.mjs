import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => console.log("CONSOLE:", m.type(), m.text()));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });

const sel = 'section[aria-labelledby="featured-heading"]';
const box = await page.locator(`${sel} article`).nth(1).boundingBox();
console.log("box", box);

const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;
const elAtPoint = await page.evaluate(({ x, y }) => {
  const el = document.elementFromPoint(x, y);
  return el ? { tag: el.tagName, cls: el.className, id: el.id } : null;
}, { x: cx, y: cy });
console.log("elementFromPoint at center:", elAtPoint);

await page.mouse.move(cx, cy, { steps: 5 });

for (const t of [0, 100, 300, 500, 850, 1200]) {
  await page.waitForTimeout(t === 0 ? 0 : 100);
  const info = await page.evaluate((s) => {
    const a = document.querySelectorAll(`${s} article`)[1];
    const f = a.querySelector('[class*="aspect-"]');
    const cs = getComputedStyle(f);
    const r = f.getBoundingClientRect();
    return { scale: cs.scale, transform: cs.transform, width: r.width, inlineScale: f.style.scale };
  }, sel);
  console.log(`t~=${t}ms`, info);
}

await browser.close();
