import type { SupabaseClient } from "@supabase/supabase-js";

export const COMMUNITY_MEDIA_BUCKET = "community-media";
export const COMMUNITY_MEDIA_LIMIT = 40 * 1024 * 1024;
const allowedTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime", "video/3gpp",
]);

export type CommunityMediaType = "image" | "video";
export type CommunityPost = {
  id: string;
  user_id: string;
  author_name: string;
  caption: string;
  media_path: string | null;
  media_type: CommunityMediaType | null;
  created_at: string;
};
export type CommunityPostWithMedia = CommunityPost & { mediaUrl: string | null };

export function validateCommunityFile(file: Pick<File, "type" | "size" | "name">) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
    mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", mov: "video/quicktime", "3gp": "video/3gpp",
  };
  const type = allowedTypes.has(file.type.toLowerCase()) ? file.type.toLowerCase() : byExtension[extension ?? ""];
  if (!type) return { error: "Choose a JPEG, PNG, WebP, or GIF photo, or an MP4, WebM, MOV, or 3GP video.", type: null };
  if (file.size > COMMUNITY_MEDIA_LIMIT) return { error: "Community photos and videos can be up to 40 MB.", type: null };
  return { error: null, type: type.startsWith("video/") ? "video" as const : "image" as const };
}

function makeMediaId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function uploadCommunityFile(supabase: SupabaseClient, userId: string, file: File) {
  const validation = validateCommunityFile(file);
  if (validation.error || !validation.type) throw new Error(validation.error ?? "Choose a supported media file.");
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  const path = `${userId}/${makeMediaId()}${extension ? `.${extension}` : ""}`;
  const type = allowedTypes.has(file.type.toLowerCase()) ? file.type.toLowerCase() : extension ? {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
    mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", mov: "video/quicktime", "3gp": "video/3gpp",
  }[extension] ?? file.type : file.type;
  const { error } = await supabase.storage.from(COMMUNITY_MEDIA_BUCKET).upload(path, file, { contentType: type, upsert: false });
  if (error) throw error;
  return { path, mediaType: validation.type };
}

/** Resolve only private storage paths through the signed-in user's Supabase client. */
export async function resolveCommunityPostMedia(supabase: SupabaseClient, posts: CommunityPost[]) {
  return Promise.all(posts.map(async (post): Promise<CommunityPostWithMedia> => {
    if (!post.media_path || post.media_path.startsWith("/") || post.media_path.includes("..") || post.media_path.includes("://")) {
      return { ...post, mediaUrl: null };
    }
    try {
      const { data, error } = await supabase.storage.from(COMMUNITY_MEDIA_BUCKET).createSignedUrl(post.media_path, 3600);
      return { ...post, mediaUrl: error ? null : data.signedUrl };
    } catch {
      return { ...post, mediaUrl: null };
    }
  }));
}

export async function removeCommunityPostMedia(supabase: SupabaseClient, userId: string, path: string | null) {
  if (!path || !path.startsWith(`${userId}/`)) return;
  const { error } = await supabase.storage.from(COMMUNITY_MEDIA_BUCKET).remove([path]);
  if (error) throw error;
}
