import type { Metadata } from "next";
export const metadata: Metadata = { title: "Artwork Guidelines" };
export default function ArtworkGuidelinesPage() {
  return (
    <article>
      <h1>Artwork Guidelines</h1>
      <p>Following these guidelines ensures your prints come out exactly as you intended.</p>
      <h2>Resolution</h2>
      <ul>
        <li>Minimum <strong>300 DPI</strong> at final print size. Low-res artwork will look blurry when printed.</li>
        <li>For large format (banners), 150 DPI at full size is acceptable.</li>
      </ul>
      <h2>Bleed & Safe Zone</h2>
      <ul>
        <li>Add <strong>3mm bleed</strong> on all four sides. Artwork elements that touch the edge must extend into the bleed.</li>
        <li>Keep all text and important elements <strong>3mm inside</strong> the trim edge (safe zone).</li>
      </ul>
      <h2>Colour Mode</h2>
      <ul>
        <li>Use <strong>CMYK</strong> colour mode for all print artwork. RGB files will be converted automatically which may shift colours.</li>
        <li>For black text, use 100% K only (not rich black) to avoid registration issues.</li>
      </ul>
      <h2>Accepted File Formats</h2>
      <ul>
        <li><strong>PDF</strong> (preferred) — Export as PDF/X-1a or PDF/X-4 with bleed marks.</li>
        <li><strong>AI</strong> — Outline all fonts before saving.</li>
        <li><strong>PSD</strong> — Flatten layers or save as a merged file.</li>
        <li><strong>PNG / JPG</strong> — Ensure minimum 300 DPI at actual print size.</li>
      </ul>
      <h2>Fonts</h2>
      <p>Embed or outline all fonts in your artwork to prevent font substitution during printing.</p>
      <h2>No Design?</h2>
      <p>Use <a href="https://www.canva.com" target="_blank" rel="noopener noreferrer">Canva</a> to design for free. Select the correct size template, design, and download as a PDF with bleed.</p>
    </article>
  );
}
