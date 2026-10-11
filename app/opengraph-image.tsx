import { OG_IMAGE_ALT, OG_IMAGE_SIZE, renderDefaultOgImage } from "@/lib/seo/ogImage";

export const alt = OG_IMAGE_ALT;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderDefaultOgImage();
}
