const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TARGET_IMAGE_BYTES = 300 * 1024;
const TARGET_THUMB_BYTES = 30 * 1024;

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("This image could not be compressed in this browser."));
    }, type, quality);
  });
}

async function compressedCanvasBlob(canvas, quality) {
  const webp = await canvasBlob(canvas, "image/webp", quality);
  return webp.type === "image/webp" ? webp : canvasBlob(canvas, "image/jpeg", quality);
}

async function readImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function compressImage(file, { maxSide, targetBytes, maxBytes }, decodedImage) {
  const image = decodedImage || await readImage(file);
  let scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  let result;

  for (let dimensionAttempt = 0; dimensionAttempt < 5; dimensionAttempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Image compression is not available in this browser.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.72, 0.62, 0.52, 0.42, 0.34]) {
      result = await compressedCanvasBlob(canvas, quality);
      if (result.size <= targetBytes) return result;
      if (maxBytes && result.size <= maxBytes) break;
    }
    if ((!maxBytes || result.size <= maxBytes) && dimensionAttempt === 4) break;
    scale *= 0.82;
  }

  if (maxBytes && result.size > maxBytes) {
    throw new Error("This image is still larger than 5 MB after compression. Choose a smaller photo.");
  }
  if (result.size > targetBytes) {
    throw new Error(maxBytes
      ? "Could not compress this photo below 300 KB. Choose a smaller photo."
      : "Could not create a preview smaller than 30 KB.");
  }
  return result;
}

export async function prepareIncidentImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  const image = await readImage(file);
  const main = await compressImage(file, {
    maxSide: 1280,
    targetBytes: TARGET_IMAGE_BYTES,
    maxBytes: MAX_IMAGE_BYTES,
  }, image);
  const thumbnail = await compressImage(file, {
    maxSide: 320,
    targetBytes: TARGET_THUMB_BYTES,
  }, image);

  if (main.size > MAX_IMAGE_BYTES) throw new Error("This image is too large to attach.");

  return { main, thumbnail };
}

export async function getVideoDuration(file) {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => reject(new Error("The video duration could not be checked."));
      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function createVideoThumbnail(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error("Could not create a preview for this video."));
      video.src = url;
    });
    video.currentTime = Math.min(0.1, Math.max(0, video.duration / 2));
    await new Promise((resolve, reject) => {
      video.onseeked = resolve;
      video.onerror = () => reject(new Error("Could not create a preview for this video."));
    });

    let scale = Math.min(1, 320 / Math.max(video.videoWidth, video.videoHeight));
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Video previews are not available in this browser.");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.62, 0.5, 0.38, 0.28]) {
        const thumbnail = await compressedCanvasBlob(canvas, quality);
        if (thumbnail.size <= TARGET_THUMB_BYTES) return thumbnail;
      }
      scale *= 0.82;
    }
    throw new Error("Could not shrink the video preview enough. Choose a shorter or smaller video.");
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export const INCIDENT_MEDIA_LIMITS = {
  imageBytes: MAX_IMAGE_BYTES,
  videoBytes: 15 * 1024 * 1024,
  videoSeconds: 15,
};
