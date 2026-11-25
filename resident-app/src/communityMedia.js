const BUCKET = 'community-media';
const MAX_BYTES = 40 * 1024 * 1024;

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const videoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp']);
const extensionTypes = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  '3gp': 'video/3gpp',
};

function getExtension(fileName) {
  const name = String(fileName || '');
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
}

function getFileContentType(file) {
  const declaredType = String(file?.type || '').toLowerCase();
  if (imageTypes.has(declaredType) || videoTypes.has(declaredType)) return declaredType;
  return extensionTypes[getExtension(file?.name)] || '';
}

export function getCommunityFileMediaType(file) {
  const contentType = getFileContentType(file);
  if (videoTypes.has(contentType)) return 'video';
  if (imageTypes.has(contentType)) return 'image';
  return '';
}

function createMediaId() {
  // randomUUID is unavailable on some mobile browsers served over local-network HTTP.
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function normalizeStoragePath(value) {
  return String(value || '').replace(/^\/+/, '');
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function mediaKindFromPath(value) {
  const pathname = String(value || '').split('?')[0].toLowerCase();
  return /\.(mp4|mov|webm|3gp|m4v)$/.test(pathname) ? 'video' : 'image';
}

export function getCommunityPostMediaKind(post) {
  if (post.media_type === 'video' || post.media_type === 'image') return post.media_type;
  return [post.media_path, post.media_url].some((value) => mediaKindFromPath(value) === 'video')
    ? 'video'
    : 'image';
}

export async function uploadCommunityMedia(supabase, userId, file) {
  const contentType = getFileContentType(file);
  const isImage = imageTypes.has(contentType);
  const isVideo = videoTypes.has(contentType);
  if (!isImage && !isVideo) {
    throw new Error('Choose a JPEG, PNG, WebP, or GIF photo, or an MP4, WebM, MOV, or 3GP video.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Community photos and videos can be up to 40 MB.');
  }

  const extension = getExtension(file.name);
  const path = `${userId}/${createMediaId()}${extension ? `.${extension}` : ''}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType,
    upsert: false,
  });
  if (error) throw error;

  return { path, mediaType: isVideo ? 'video' : 'image' };
}

async function resolveStoredMedia(supabase, bucket, items) {
  const mediaPaths = [...new Set(items
    .flatMap((post) => [
      ...(Array.isArray(post.media_paths) ? post.media_paths : []),
      post.media_path,
    ])
    .filter((path) => path && !isHttpUrl(path))
    .map(normalizeStoragePath)
    .filter(Boolean))];
  const signedUrls = new Map();

  if (mediaPaths.length) {
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(mediaPaths, 86400);
      if (error) throw error;
      for (const [index, item] of (data || []).entries()) {
        const path = normalizeStoragePath(item?.path || mediaPaths[index]);
        const signedUrl = item?.signedUrl || item?.signedURL;
        if (path && signedUrl && !item?.error) signedUrls.set(path, signedUrl);
      }
    } catch (error) {
      // Keep the rest of the feed visible if one private media object cannot be signed.
      console.warn(`Unable to create signed URLs from the ${bucket} bucket.`, error);
    }
  }

  return items.map((post) => {
    const rawPath = String(post.media_path || '').trim();
    const path = normalizeStoragePath(rawPath);
    const legacyUrl = String(post.media_url || '').trim();
    const paths = Array.isArray(post.media_paths) && post.media_paths.length
      ? post.media_paths
      : rawPath
        ? [rawPath]
        : [];
    const types = Array.isArray(post.media_types) ? post.media_types : [];
    const mediaUrls = paths.map((mediaPath, index) => {
      const mediaPathString = String(mediaPath || '').trim();
      const normalizedPath = normalizeStoragePath(mediaPathString);
      const url = (isHttpUrl(mediaPathString) ? mediaPathString : '')
        || signedUrls.get(normalizedPath)
        || (normalizedPath === path ? legacyUrl : '');
      if (!url) return null;
      const type = ['image', 'video'].includes(types[index])
        ? types[index]
        : normalizedPath === path
          ? getCommunityPostMediaKind(post)
          : getCommunityPostMediaKind({ media_path: mediaPathString });
      return { url, type };
    }).filter(Boolean);
    const displayMediaUrl = mediaUrls[0]?.url
      || (isHttpUrl(rawPath) ? rawPath : '')
      || signedUrls.get(path)
      || legacyUrl;
    const displayMediaType = mediaUrls[0]?.type || getCommunityPostMediaKind(post);

    return {
      ...post,
      media_urls: mediaUrls,
      displayMediaType,
      displayMediaUrl,
    };
  });
}

export function resolveCommunityPosts(supabase, posts) {
  return resolveStoredMedia(supabase, BUCKET, posts);
}

export function resolveIncidentReports(supabase, incidents) {
  return resolveStoredMedia(supabase, 'incident-media', incidents);
}

export async function removeCommunityMedia(supabase, path) {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn('Could not remove the unused community upload.', error);
}
