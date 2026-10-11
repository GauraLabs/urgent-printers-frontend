import { ImageResponse } from "next/og";
import { SITE_NAME } from "./site";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const OG_IMAGE_ALT = `${SITE_NAME} — wedding cards, invitations and celebration printing`;

export function renderDefaultOgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf3ee",
          color: "#7a3b24",
          padding: 80,
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 40, marginTop: 28, textAlign: "center", color: "#4a3a33" }}>
          Wedding cards, invitations &amp; celebration printing
        </div>
        <div style={{ fontSize: 30, marginTop: 40, color: "#b76e4a" }}>Premium quality · Delivered across India</div>
      </div>
    ),
    OG_IMAGE_SIZE,
  );
}
