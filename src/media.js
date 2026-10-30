// Limits for report attachments
export const MAX_FILES = 5;
export const MAX_IMAGE_MB = 10;
export const MAX_VIDEO_MB = 40;

const MB = 1024 * 1024;

// Checks newly picked files. Returns { accepted: File[], errors: string[] }.
export function validateFiles(current, incoming) {
  const accepted = [];
  const errors = [];

  for (const file of incoming) {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      errors.push(`${file.name}: only photos and videos can be attached.`);
      continue;
    }

    const limitMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (file.size > limitMb * MB) {
      errors.push(
        `${file.name} is too large. ${isVideo ? "Videos" : "Photos"} can be up to ${limitMb} MB.`
      );
      continue;
    }

    if (current.length + accepted.length >= MAX_FILES) {
      errors.push(`You can attach up to ${MAX_FILES} files per report.`);
      break;
    }

    accepted.push(file);
  }

  return { accepted, errors };
}

// Uploads files to the "report-media" bucket, inside a folder named after the
// signed-in resident. Returns a list of public URLs to save with the report.
export async function uploadReportMedia(supabase, userId, files) {
  const urls = [];

  for (const file of files) {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from("report-media")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from("report-media").getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

// True if a saved URL points to a video (used when showing a report).
export function isVideoUrl(url) {
  return /\.(mp4|mov|webm|3gp|m4v)(\?.*)?$/i.test(url);
}