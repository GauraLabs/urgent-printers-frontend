import type { Metadata } from "next";
export const metadata: Metadata = { title: "Returns Policy" };
export default function ReturnsPage() {
  return (
    <article>
      <h1>Returns & Refund Policy</h1>
      <p>Because print products are made to your specification, we cannot accept returns simply because you changed your mind. However, we stand fully behind our quality.</p>
      <h2>Quality Issues</h2>
      <p>If your order arrives damaged, defective, or significantly different from what was approved, we will reprint or refund in full. Contact us within <strong>7 days of delivery</strong> with photos of the issue.</p>
      <h2>Artwork Errors</h2>
      <p>We are not liable for errors in artwork that was approved by you (spelling mistakes, wrong colours in uploaded files, etc.). Please proof your files carefully before submitting.</p>
      <h2>Order Cancellations</h2>
      <ul>
        <li><strong>Before artwork approval</strong> — Full refund within 3–5 business days.</li>
        <li><strong>After artwork approval but before printing</strong> — 50% refund.</li>
        <li><strong>After printing begins</strong> — No refund (materials and labour already committed).</li>
      </ul>
      <h2>How to Claim</h2>
      <p>Email <a href="mailto:support@urgentprinters.com">support@urgentprinters.com</a> with your order number and photos. We aim to resolve all quality claims within 2 business days.</p>
    </article>
  );
}
