"use client";

import { useState, useEffect } from "react";
import { Trash2, ImageIcon, Loader2 } from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { getSavedArtworks, deleteArtwork, type SavedArtwork } from "@/lib/api/artwork";
import { formatFileSize, cn } from "@/lib/utils";

interface SavedArtworksProps {
  onSelect: (fileKey: string, fileName: string) => void;
}

export function SavedArtworks({ onSelect }: SavedArtworksProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const _isHydrated = useAuthStore((s) => s._isHydrated);

  const [artworks, setArtworks] = useState<SavedArtwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!_isHydrated || !isAuthenticated || !token) return;
    setLoading(true);
    getSavedArtworks(token)
      .then(setArtworks)
      .catch(() => setArtworks([]))
      .finally(() => setLoading(false));
  }, [_isHydrated, isAuthenticated, token]);

  if (!_isHydrated || !isAuthenticated || (artworks.length === 0 && !loading)) return null;

  async function handleDelete(artwork: SavedArtwork) {
    if (!token) return;
    setDeletingId(artwork.id);
    try {
      await deleteArtwork(artwork.id, token);
      setArtworks((prev) => prev.filter((a) => a.id !== artwork.id));
      if (selectedKey === artwork.file_key) {
        setSelectedKey(null);
        onSelect("", "");
      }
    } finally {
      setDeletingId(null);
    }
  }

  function handleSelect(artwork: SavedArtwork) {
    setSelectedKey(artwork.file_key);
    onSelect(artwork.file_key, artwork.original_filename);
  }

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
        Your Saved Artworks
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {artworks.map((artwork) => {
            const isSelected = selectedKey === artwork.file_key;
            return (
              <div
                key={artwork.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                )}
                onClick={() => handleSelect(artwork)}
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  isSelected ? "bg-primary/10" : "bg-muted"
                )}>
                  <ImageIcon size={16} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", isSelected && "text-primary")}>
                    {artwork.original_filename}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatFileSize(artwork.file_size)}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(artwork); }}
                  disabled={deletingId === artwork.id}
                  aria-label="Delete artwork"
                  className="shrink-0 p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                >
                  {deletingId === artwork.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />
                  }
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
