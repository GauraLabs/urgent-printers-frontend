import type { Metadata } from "next";
export const metadata: Metadata = { title: "Terms of Service" };
export default function TermsPage() {
  return (
    <article>
      <h1>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: April 2026</p>
      <p>By using urgentprinters.in you agree to these terms. These terms are governed by the laws of India.</p>
      <h2>Orders & Payment</h2>
      <ul>
        <li>All prices are in Indian Rupees (₹) and inclusive of applicable taxes unless stated otherwise.</li>
        <li>GST at the applicable rate will be added at checkout.</li>
        <li>Orders are confirmed only after successful payment authorisation.</li>
        <li>We reserve the right to cancel orders that violate our policies.</li>
      </ul>
      <h2>Artwork & Intellectual Property</h2>
      <ul>
        <li>You warrant that you own or have rights to all artwork submitted for printing.</li>
        <li>We will not print content that is illegal, defamatory, or infringes third-party IP.</li>
        <li>Submitting artwork grants us a limited licence to reproduce it solely for fulfilment of your order.</li>
      </ul>
      <h2>Quality & Colour</h2>
      <p>Print colours may vary slightly from on-screen previews due to monitor calibration and printing processes. We guarantee print quality matching the submitted artwork within industry tolerances (±10% colour variance).</p>
      <h2>Limitation of Liability</h2>
      <p>Our liability is limited to the value of the order in question. We are not liable for indirect or consequential loss.</p>
      <h2>Dispute Resolution</h2>
      <p>Disputes will be resolved under the jurisdiction of courts in Mumbai, Maharashtra, India.</p>
    </article>
  );
}
