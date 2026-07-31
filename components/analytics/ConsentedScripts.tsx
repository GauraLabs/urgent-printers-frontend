"use client";

import Script from "next/script";
import { useConsent } from "@/hooks/useConsent";

interface GatedScriptConfig {
  key: string;
  /** External script URL. Omit for a purely inline script. */
  src?: string;
  /** Required by next/script when the script has inline body content. */
  id?: string;
  /** Inline script body, rendered as this Script's children. */
  inlineBody?: string;
}

// Analytics-only scripts, gated on consent === "accepted". Google Sign-In and
// Razorpay checkout.js stay directly in app/layout.tsx, unconditional — they
// are essential/functional, not analytics, and are out of scope for this
// gate per the approved cookie-consent plan.
//
// Add future gated scripts (e.g. Meta Pixel) as one more entry here — do not
// add new inline conditionals in the component below.
const GATED_SCRIPTS: GatedScriptConfig[] = [
  {
    key: "microsoft-clarity",
    id: "microsoft-clarity",
    inlineBody: `(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "xuel02vjkg");`,
  },
  {
    key: "ga4-loader",
    src: "https://www.googletagmanager.com/gtag/js?id=G-VQYX1D7JCP",
  },
  {
    key: "ga4-init",
    id: "google-analytics",
    inlineBody: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-VQYX1D7JCP');`,
  },
];

export function ConsentedScripts() {
  const { status } = useConsent();

  if (status !== "accepted") return null;

  return (
    <>
      {GATED_SCRIPTS.map(({ key, src, id, inlineBody }) => (
        <Script key={key} id={id} src={src} strategy="afterInteractive">
          {inlineBody}
        </Script>
      ))}
    </>
  );
}
