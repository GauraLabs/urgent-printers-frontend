import type { Metadata } from "next";
import { CookiePreferencesManager } from "./CookiePreferencesManager";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiesPage() {
  return (
    <article>
      <h1>Cookie Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: July 2026</p>
      <p>We use cookies and similar technologies to operate our website and improve your experience.</p>
      <h2>What Are Cookies</h2>
      <p>Cookies are small text files stored on your device. They help us remember your preferences and understand how you use our site.</p>
      <h2>Cookies We Use</h2>
      <ul>
        <li><strong>Essential</strong> — Required for the site to function: cart, authentication (Google Sign-In), and checkout (Razorpay). Always on and cannot be disabled.</li>
        <li><strong>Preference</strong> — Remember your theme and display settings. Always on, stored only on your device.</li>
        <li><strong>Analytics</strong> — Help us understand which pages are popular (Google Analytics, Microsoft Clarity). Only loaded if you accept below.</li>
      </ul>
      <p>
        We do not currently run marketing/advertising cookies (e.g. ad-retargeting pixels). If that changes, this
        page and the choice below will be updated to cover them before they load for anyone.
      </p>
      <h2>Your Choice</h2>
      <p>
        On your first visit we ask whether we can load the analytics cookies above. Essential and preference
        cookies aren&apos;t part of that choice — the site can&apos;t function without them. You can change your
        analytics choice at any time below.
      </p>
      <CookiePreferencesManager />
      <h2>Managing Cookies</h2>
      <p>You can also control cookies through your browser settings. Disabling essential cookies will affect site functionality. You can opt out of analytics cookies by installing the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a>.</p>
    </article>
  );
}
