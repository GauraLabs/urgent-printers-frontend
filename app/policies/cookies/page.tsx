import type { Metadata } from "next";
export const metadata: Metadata = { title: "Cookie Policy" };
export default function CookiesPage() {
  return (
    <article>
      <h1>Cookie Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: April 2026</p>
      <p>We use cookies and similar technologies to operate our website and improve your experience.</p>
      <h2>What Are Cookies</h2>
      <p>Cookies are small text files stored on your device. They help us remember your preferences and understand how you use our site.</p>
      <h2>Cookies We Use</h2>
      <ul>
        <li><strong>Essential</strong> — Required for the site to function (cart, authentication). Cannot be disabled.</li>
        <li><strong>Preference</strong> — Remember your theme and language settings.</li>
        <li><strong>Analytics</strong> — Help us understand which pages are popular (Google Analytics). Anonymised.</li>
        <li><strong>Marketing</strong> — Used to show relevant ads. Only set if you consent.</li>
      </ul>
      <h2>Managing Cookies</h2>
      <p>You can control cookies through your browser settings. Disabling essential cookies will affect site functionality. You can opt out of analytics cookies by installing the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a>.</p>
    </article>
  );
}
