import { XCircle } from "lucide-react";
import { getProofInfo } from "@/lib/api/orders";
import type { Metadata } from "next";
import ProofApprovalClient from "./ProofApprovalClient";

export const metadata: Metadata = {
  title: "Artwork Proof Approval",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ProofApprovalPage({ params }: Props) {
  const { token } = await params;

  let proofInfo = null;
  try {
    proofInfo = await getProofInfo(token);
  } catch {
    // 404 or expired/invalid token — render the expired state below
  }

  if (!proofInfo) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 flex items-start gap-4">
        <XCircle size={24} className="text-destructive shrink-0 mt-0.5" />
        <div>
          <h1 className="font-heading font-semibold text-lg text-destructive">
            Link Expired or Invalid
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            This artwork proof link has expired or has already been used. Please check your
            email or WhatsApp for a newer link, or contact our support team.
          </p>
        </div>
      </div>
    );
  }

  return <ProofApprovalClient proofInfo={proofInfo} token={token} />;
}
