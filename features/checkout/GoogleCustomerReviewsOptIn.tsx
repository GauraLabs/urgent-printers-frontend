"use client";

import { useRef } from "react";
import Script from "next/script";
import type { GcrConfig } from "@/lib/gcr";

interface Gapi {
  load: (name: string, cb: () => void) => void;
  surveyoptin?: { render: (config: GcrConfig) => void };
}

declare global {
  interface Window {
    gapi?: Gapi;
  }
}

interface Props {
  config: GcrConfig | null;
}

export function GoogleCustomerReviewsOptIn({ config }: Props) {
  const rendered = useRef(false);
  if (!config) return null;

  const render = () => {
    if (rendered.current) return;
    const gapi = window.gapi;
    if (!gapi) return;
    rendered.current = true;
    gapi.load("surveyoptin", () => window.gapi?.surveyoptin?.render(config));
  };

  return (
    <Script
      id="google-customer-reviews"
      src="https://apis.google.com/js/platform.js"
      strategy="afterInteractive"
      onReady={render}
    />
  );
}
