export const PRINT_SPECS = {
  minDpi: 300,
  recommendedDpi: 300,
  bleedMm: 3,
  acceptedFileTypes: [".pdf", ".ai", ".psd", ".png", ".jpg", ".jpeg"],
  acceptedMimeTypes: [
    "application/pdf",
    "application/illustrator",
    "image/vnd.adobe.photoshop",
    "image/png",
    "image/jpeg",
  ],
  maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
  canvaUrl: "https://www.canva.com",
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  placed: "Order Placed",
  confirmed: "Confirmed",
  printing: "Printing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
