export default function ProofApprovalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-12 px-4 pb-16">
      <div className="w-full max-w-2xl">
        {children}
      </div>
    </div>
  );
}
