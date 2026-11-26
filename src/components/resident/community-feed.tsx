"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Clapperboard, LoaderCircle, MapPinned, Send, Trash2, Upload, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/provider";
import {
  COMMUNITY_MEDIA_BUCKET, type CommunityPost, type CommunityPostWithMedia,
  removeCommunityPostMedia, resolveCommunityPostMedia, uploadCommunityFile, validateCommunityFile,
} from "@/lib/resident/community";
import styles from "./resident-community.module.css";

const postColumns = "id, user_id, author_name, caption, media_path, media_type, created_at";

export function ResidentCommunityFeed({ userId, fullName }: { userId: string; fullName: string }) {
  const { t } = useI18n();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [posts, setPosts] = useState<CommunityPostWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const { data, error: loadError } = await supabase.from("community_posts")
        .select(postColumns).order("created_at", { ascending: false }).limit(60);
      if (loadError) throw loadError;
      const resolved = await resolveCommunityPostMedia(supabase, (data ?? []) as CommunityPost[]);
      setPosts(resolved);
      setError("");
    } catch {
      setError(t("resident.community.loadError"));
    } finally {
      setLoading(false);
    }
  }, [supabase, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPosts(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPosts]);

  useEffect(() => {
    const channel = supabase.channel("resident-community-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, () => { void loadPosts(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadPosts, supabase]);

  function chooseFile(next: File | null) {
    setError("");
    setNotice("");
    if (next) {
      const validation = validateCommunityFile(next);
      if (validation.error) { setError(validation.error); return; }
    }
    setFile(next);
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!file) { setError(t("resident.community.chooseMedia")); return; }
    const validation = validateCommunityFile(file);
    if (validation.error || !validation.type) { setError(validation.error ?? t("resident.community.chooseMedia")); return; }
    setBusy(true);
    let uploadedPath: string | null = null;
    try {
      const upload = await uploadCommunityFile(supabase, userId, file);
      uploadedPath = upload.path;
      const { data, error: insertError } = await supabase.from("community_posts").insert({
        user_id: userId,
        author_name: fullName.trim().slice(0, 120) || t("role.resident"),
        caption: caption.trim().slice(0, 500),
        media_path: upload.path,
        media_type: upload.mediaType,
        media_url: null,
      }).select(postColumns).single();
      if (insertError) throw insertError;
      const [post] = await resolveCommunityPostMedia(supabase, [data as CommunityPost]);
      setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
      setCaption("");
      setFile(null);
      const input = event.currentTarget.querySelector<HTMLInputElement>("input[type=file]");
      if (input) input.value = "";
      setNotice(t("resident.community.published"));
    } catch {
      if (uploadedPath) {
        try {
          const { error: cleanupError } = await supabase.storage.from(COMMUNITY_MEDIA_BUCKET).remove([uploadedPath]);
          if (cleanupError) console.warn("Could not remove an unused community upload.", cleanupError);
        } catch (cleanupError) {
          console.warn("Could not remove an unused community upload.", cleanupError);
        }
      }
      setError(t("resident.community.publishError"));
    } finally {
      setBusy(false);
    }
  }

  async function removePost(post: CommunityPostWithMedia) {
    setDeleting(post.id);
    setError("");
    setNotice("");
    try {
      const { data, error: deleteError } = await supabase.from("community_posts")
        .delete().eq("id", post.id).eq("user_id", userId).select("id").maybeSingle();
      if (deleteError) throw deleteError;
      if (!data) throw new Error("Post could not be removed.");
      setPosts((current) => current.filter((item) => item.id !== post.id));
      try {
        await removeCommunityPostMedia(supabase, userId, post.media_path);
        setNotice(t("resident.community.removed"));
      } catch {
        setNotice(t("resident.community.removedMediaCleanup"));
      }
    } catch {
      setError(t("resident.community.removeError"));
    } finally {
      setDeleting(null);
    }
  }

  return <section className={styles.community} aria-labelledby="community-heading">
    <div className={styles.communityToolbar}>
      <div>
        <h2 id="community-heading"><Clapperboard size={19} /> {t("resident.community.title")}</h2>
        <p>{t("resident.community.subtitle")}</p>
      </div>
      <Link className="button secondary" href="/resident/map"><MapPinned size={16} /> {t("resident.map.open")}</Link>
    </div>

    <form className={`${styles.composer} panel`} onSubmit={publish}>
      <div>
        <h3>{t("resident.community.shareTitle")}</h3>
        <p>{t("resident.community.shareHint")}</p>
      </div>
      <label className={styles.mediaPicker}>
        <Upload size={17} />
        <span>{file ? file.name : t("resident.community.chooseMedia")}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/3gpp" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} disabled={busy} />
      </label>
      {file && <button className={styles.clearMedia} type="button" onClick={() => chooseFile(null)} disabled={busy}><X size={15} /> {t("resident.community.removeMedia")}</button>}
      <label className={styles.captionField}>
        <span>{t("resident.community.caption")}</span>
        <textarea rows={2} maxLength={500} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder={t("resident.community.captionPlaceholder")} />
      </label>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <button className="button primary" type="submit" disabled={busy || !file}>
        {busy ? <LoaderCircle className={styles.spin} size={16} /> : <Send size={16} />}
        {busy ? t("resident.community.sharing") : t("resident.community.share")}
      </button>
    </form>

    {loading && <p className={styles.empty} role="status">{t("resident.community.loading")}</p>}
    {!loading && !posts.length && !error && <p className={styles.empty}>{t("resident.community.empty")}</p>}
    <div className={styles.feed}>
      {posts.map((post) => <article className={styles.post} key={post.id}>
        <div className={styles.postMeta}>
          <div><strong>{post.user_id === userId ? (fullName.trim().split(/\s+/)[0] || t("resident.community.you")) : t("role.resident")}</strong><small>{new Date(post.created_at).toLocaleString()}</small></div>
          {post.user_id === userId && <button className={styles.deletePost} type="button" onClick={() => void removePost(post)} disabled={deleting === post.id} aria-label={t("resident.community.deletePost")}>
            {deleting === post.id ? <LoaderCircle className={styles.spin} size={16} /> : <Trash2 size={16} />}
          </button>}
        </div>
        {post.mediaUrl ? post.media_type === "video"
          ? <video className={styles.postMedia} controls playsInline preload="metadata"><source src={post.mediaUrl} /></video>
          // Private signed storage URLs are displayed as native images.
          : <img className={styles.postMedia} src={post.mediaUrl} alt={post.caption || t("resident.community.postImageAlt")} loading="lazy" />
          : <div className={styles.mediaUnavailable}>{t("resident.community.mediaUnavailable")}</div>}
        {post.caption && <p className={styles.caption}>{post.caption}</p>}
      </article>)}
    </div>
  </section>;
}
