"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Replaces the root layout on catastrophic errors — must include <html> and <body>
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-IN">
      <body className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center font-sans">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Critical Error</h1>
        <p className="text-gray-500 text-sm mb-6 max-w-sm">
          A critical error occurred. Please refresh the page.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 font-mono mb-6">ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw size={15} /> Try Again
        </button>
      </body>
    </html>
  );
}
