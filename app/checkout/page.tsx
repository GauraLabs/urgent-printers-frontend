import { getSiteStatus } from "@/lib/api/siteStatus";
import { CheckoutPageClient } from "@/features/checkout/CheckoutPageClient";

export default async function CheckoutPage() {
  const siteStatus = await getSiteStatus();

  return <CheckoutPageClient siteStatus={siteStatus} />;
}
