"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useDropzone, type FileRejection } from "react-dropzone";
import { UploadCloud, FileCheck2, X, AlertCircle, ExternalLink, Info, Loader2 } from "lucide-react";
import { PRINT_SPECS } from "@/lib/constants/print-specs";
import { formatFileSize, cn } from "@/lib/utils";
import { presignArtwork } from "@/lib/api/artwork";
import { useAuthStore } from "@/features/auth/store";

const PREVIEWABLE_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

interface UploadedFile {
  name: string;
  size: number;
  previewUrl: string | null;
}

interface ArtworkUploadProps {
  onChange?: (fileKey: string, fileName: string) => void;
}

export function ArtworkUpload({ onChange }: ArtworkUploadProps) {
  const token = useAuthStore((s) => s.token ?? undefined);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Tracks the currently-active blob: URL so it can be revoked on unmount
  // even if a stale closure holds an outdated `file` value.
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const onDrop = useCallback(
    async (accepted: File[], rejected: FileRejection[]) => {
      setError(null);
      if (rejected.length > 0) {
        setError(rejected[0]?.errors[0]?.message ?? "Invalid file");
        return;
      }
      const picked = accepted[0];
      if (!picked) return;

      const previewUrl = PREVIEWABLE_IMAGE_MIMES.has(picked.type)
        ? URL.createObjectURL(picked)
        : null;
      previewUrlRef.current = previewUrl;

      setUploading(true);
      try {
        const { upload_url, file_key } = await presignArtwork(
          { filename: picked.name, mime_type: picked.type, file_size: picked.size },
          token
        );

        const putRes = await fetch(upload_url, {
          method: "PUT",
          body: picked,
          headers: { "Content-Type": picked.type },
        });
        if (!putRes.ok) throw new Error("Upload to storage failed");

        setFile({ name: picked.name, size: picked.size, previewUrl });
        onChange?.(file_key, picked.name);
      } catch (err) {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          previewUrlRef.current = null;
        }
        setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [token, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/postscript": [".ai"],
      "image/vnd.adobe.photoshop": [".psd"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxFiles: 1,
    maxSize: PRINT_SPECS.maxFileSizeBytes,
    disabled: uploading,
  });

  function handleRemove() {
    if (file?.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
      previewUrlRef.current = null;
    }
    setFile(null);
    setError(null);
    onChange?.("", "");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Upload Artwork
        </p>
        <span className="text-[10px] text-muted-foreground">Optional — upload now or later</span>
      </div>

      {/* Dropzone / uploading / success states */}
      {!file ? (
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer shadow-sm",
            "transition-all text-center",
            uploading && "pointer-events-none opacity-70",
            isDragActive
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <input {...getInputProps({ "aria-label": "Upload artwork file" })} />
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            isDragActive ? "bg-primary/10" : "bg-muted"
          )}>
            {uploading
              ? <Loader2 size={22} className="text-primary animate-spin" />
              : <UploadCloud size={22} className={cn(isDragActive ? "text-primary" : "text-muted-foreground")} />
            }
          </div>
          <div>
            <p className="text-sm font-medium">
              {uploading ? "Uploading…" : isDragActive ? "Drop it here!" : "Drag & drop your artwork"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, AI, PSD, PNG, JPG · Max 100MB
            </p>
          </div>
          {!uploading && (
            <span className="text-xs text-primary font-medium underline underline-offset-2">
              or click to browse files
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-success/40 bg-success/5 shadow-sm">
          {file.previewUrl ? (
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-success/40">
              {/* blob: object URL — next/image auto-marks these unoptimized, no remotePattern needed */}
              <Image src={file.previewUrl} alt={file.name} fill sizes="40px" className="object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <FileCheck2 size={18} className="text-success" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
          </div>
          <button
            onClick={handleRemove}
            aria-label="Remove file"
            className="shrink-0 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-destructive text-xs p-3 rounded-xl bg-destructive/5 border border-destructive/20">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Spec requirements */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-xl bg-muted/50 border border-border shadow-sm">
        <Info size={13} className="shrink-0 mt-0.5 text-primary" />
        <div className="space-y-0.5">
          <p>
            <span className="font-semibold text-foreground">Minimum {PRINT_SPECS.minDpi} DPI</span> for sharp print quality
          </p>
          <p>
            <span className="font-semibold text-foreground">{PRINT_SPECS.bleedMm}mm bleed</span> on all sides to avoid white borders
          </p>
          <p>Accepted: PDF, AI, PSD, PNG, JPG</p>
        </div>
      </div>

      {/* Canva CTA */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card shadow-sm">
        <div>
          <p className="text-xs font-semibold">No design ready?</p>
          <p className="text-[11px] text-muted-foreground">Create one free on Canva</p>
        </div>
        <a
          href={PRINT_SPECS.canvaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold",
            "bg-[#7D2AE8] text-white hover:bg-[#6a25c7] transition-colors"
          )}
        >
          Open Canva <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
