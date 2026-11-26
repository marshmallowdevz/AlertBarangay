import { describe, expect, it, vi } from "vitest";
import { resolveCommunityPostMedia, validateCommunityFile, type CommunityPost } from "@/lib/resident/community";

describe("resident community media", () => {
  it("accepts supported media under the existing private bucket limit", () => {
    expect(validateCommunityFile({ name: "photo.webp", type: "image/webp", size: 1024 }).type).toBe("image");
    expect(validateCommunityFile({ name: "clip.mp4", type: "video/mp4", size: 1024 }).type).toBe("video");
  });

  it("rejects unsupported and oversized media", () => {
    expect(validateCommunityFile({ name: "script.html", type: "text/html", size: 10 }).error).toMatch(/Choose a JPEG/);
    expect(validateCommunityFile({ name: "large.mp4", type: "video/mp4", size: 40 * 1024 * 1024 + 1 }).error).toMatch(/40 MB/);
  });

  it("signs private storage paths and never trusts a stored external URL", async () => {
    const createSignedUrl = vi.fn(async (path: string) => ({ data: { signedUrl: `https://signed.example/${path}` }, error: null }));
    const supabase = { storage: { from: () => ({ createSignedUrl }) } } as never;
    const posts = [
      { id: "one", user_id: "resident", author_name: "Resident", caption: "Photo", media_path: "resident/photo.webp", media_type: "image", created_at: "2026-01-01" },
      { id: "two", user_id: "resident", author_name: "Resident", caption: "Old URL", media_path: "https://unsafe.example/photo.jpg", media_type: "image", created_at: "2026-01-01" },
    ] satisfies CommunityPost[];
    const resolved = await resolveCommunityPostMedia(supabase, posts);

    expect(createSignedUrl).toHaveBeenCalledTimes(1);
    expect(createSignedUrl).toHaveBeenCalledWith("resident/photo.webp", 3600);
    expect(resolved.map((post) => post.mediaUrl)).toEqual([
      "https://signed.example/resident/photo.webp",
      null,
    ]);
  });

  it("keeps a post visible when signed URL generation fails", async () => {
    const supabase = { storage: { from: () => ({ createSignedUrl: async () => { throw new Error("offline"); } }) } } as never;
    const [post] = await resolveCommunityPostMedia(supabase, [{
      id: "one", user_id: "resident", author_name: "Resident", caption: "Photo",
      media_path: "resident/photo.webp", media_type: "image", created_at: "2026-01-01",
    }]);
    expect(post.mediaUrl).toBeNull();
  });
});
