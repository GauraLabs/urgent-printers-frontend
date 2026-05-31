import { API_URL } from "./client";

async function artworkFetch<T>(
  path: string,
  init: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(rest.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  if (res.status === 204) return undefined as T;
  const json: unknown = await res.json();
  if (json !== null && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresignRequest {
  filename: string;
  mime_type: string;
  file_size: number;
}

export interface PresignResponse {
  upload_url: string;
  file_key: string;
  expires_in: number;
}

export interface SavedArtwork {
  id: number;
  file_key: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_url: string;
  uploaded_at: string;
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function presignArtwork(
  body: PresignRequest,
  token?: string
): Promise<PresignResponse> {
  return artworkFetch<PresignResponse>(`/artwork/presign`, {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export async function getSavedArtworks(token: string): Promise<SavedArtwork[]> {
  return artworkFetch<SavedArtwork[]>(`/artworks`, { token });
}

export async function deleteArtwork(id: number, token: string): Promise<void> {
  return artworkFetch<void>(`/artworks/${id}`, {
    method: "DELETE",
    token,
  });
}
