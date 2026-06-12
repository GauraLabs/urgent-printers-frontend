import type { Metadata } from "next";
export const metadata: Metadata = { title: "Privacy Policy" };
export default function PrivacyPage() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: April 2026</p>
      <p>Urgent Printers Pvt. Ltd. (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) is committed to protecting your personal information in accordance with the <strong>Information Technology Act, 2000</strong> and the <strong>Digital Personal Data Protection Act, 2023</strong>.</p>
      <h2>Information We Collect</h2>
      <ul>
        <li><strong>Account data</strong> — name, email address, mobile number when you register</li>
        <li><strong>Order data</strong> — delivery address, order history, payment method (we do not store full card details)</li>
        <li><strong>Usage data</strong> — pages visited, device type, browser via cookies</li>
        <li><strong>Artwork files</strong> — files you upload for printing, stored securely and deleted after 30 days post-delivery</li>
      </ul>
      <h2>How We Use Your Information</h2>
      <ul>
        <li>To process and deliver your orders</li>
        <li>To send order updates and transactional emails/SMS</li>
        <li>To improve our services and personalise your experience</li>
        <li>To comply with legal obligations under Indian law</li>
      </ul>
      <h2>Data Sharing</h2>
      <p>We do not sell your personal data. We share data only with: (a) payment processors (Razorpay/PayU) under their own privacy policies; (b) logistics partners for order delivery; (c) legal authorities when required by law.</p>
      <h2>Data Retention</h2>
      <p>Account data is retained for the duration of your account. Order data is retained for 7 years as required by Indian tax law. Artwork files are deleted 30 days after delivery.</p>
      <h2>Your Rights</h2>
      <p>You may access, correct, or request deletion of your personal data by emailing <a href="mailto:privacy@urgentprinters.in">privacy@urgentprinters.in</a>.</p>
      <h2>Contact</h2>
      <p>Data Protection Officer: <a href="mailto:privacy@urgentprinters.in">privacy@urgentprinters.in</a> | Urgent Printers Pvt. Ltd., Kotwali Rd, Tilak Dwar, Mathura, Uttar Pradesh 281001, India.</p>
    </article>
  );
}
