import type { Metadata } from "next";
export const metadata: Metadata = { title: "Shipping Info" };
export default function ShippingPage() {
  return (
    <article>
      <h1>Shipping Information</h1>
      <p>We deliver across India via Delhivery, Blue Dart, and DTDC.</p>
      <h2>Delivery Options</h2>
      <ul>
        <li><strong>Standard (5–7 business days)</strong> — ₹99, free on orders over ₹999</li>
        <li><strong>Rush (3 business days)</strong> — ₹149</li>
        <li><strong>Overnight (next business day)</strong> — ₹249 (order by 2 PM)</li>
      </ul>
      <h2>Production Time</h2>
      <p>Production begins after artwork approval. Standard turnaround is 2–3 business days before dispatch. Rush and overnight orders are prioritised on the press.</p>
      <h2>Tracking</h2>
      <p>You will receive a tracking number via email and SMS once your order is dispatched. Track via your <a href="/account/orders">order history</a>.</p>
      <h2>Undeliverable Orders</h2>
      <p>If delivery fails after two attempts, the parcel is returned to us. Re-delivery incurs a ₹149 fee. Contact us within 7 days to arrange re-delivery.</p>
      <h2>Bulk Orders</h2>
      <p>For orders above 50kg or requiring pallet delivery, please contact us for a custom quote.</p>
    </article>
  );
}
