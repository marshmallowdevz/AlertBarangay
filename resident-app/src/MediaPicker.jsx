import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, Video, X } from "lucide-react";
import { validateFiles, isVideoUrl, MAX_FILES } from "./media";

// Used inside the "Report" form so residents can attach photos and videos.
//   files    = array of File objects (state in the parent)
//   onChange = setter for that array
//   onError  = optional, receives a message string (or "" to clear)
export default function MediaPicker({ files, onChange, onError, disabled }) {
  const inputRef = useRef(null);

  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        isVideo: file.type.startsWith("video/"),
      })),
    [files]
  );

  useEffect(
    () => () => previews.forEach((p) => URL.revokeObjectURL(p.url)),
    [previews]
  );

  const handlePick = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // lets the same file be picked again
    if (!picked.length) return;

    const { accepted, errors } = validateFiles(files, picked);
    if (accepted.length) onChange([...files, ...accepted]);
    if (onError) onError(errors.join(" "));
  };

  const removeAt = (index) => {
    onChange(files.filter((_, i) => i !== index));
    if (onError) onError("");
  };

  return (
    <div className="media-picker">
      <span className="media-label">Photos or videos (optional)</span>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: "none" }}
        onChange={handlePick}
      />

      <button
        type="button"
        className="media-add"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || files.length >= MAX_FILES}
      >
        <ImagePlus size={20} />
        Add photos or videos
      </button>

      <small className="media-hint">
        Up to {MAX_FILES} files. Clear photos help responders find and assess
        the problem faster.
      </small>

      {previews.length > 0 && (
        <div className="media-grid">
          {previews.map((p, i) => (
            <div className="media-thumb" key={p.url}>
              {p.isVideo ? (
                <video src={`${p.url}#t=0.1`} muted playsInline preload="metadata" />
              ) : (
                <img src={p.url} alt={`Attachment ${i + 1}`} />
              )}
              {p.isVideo && (
                <span className="media-badge">
                  <Video size={12} /> Video
                </span>
              )}
              <button
                type="button"
                className="media-remove"
                aria-label={`Remove attachment ${i + 1}`}
                onClick={() => removeAt(i)}
                disabled={disabled}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Shows saved attachments of a report (use it in "My Reports" > View details).
export function ReportMedia({ urls }) {
  if (!urls || urls.length === 0) return null;

  return (
    <div className="media-grid">
      {urls.map((url) =>
        isVideoUrl(url) ? (
          <div className="media-thumb" key={url}>
            <video src={url} controls playsInline preload="metadata" />
          </div>
        ) : (
          <a
            className="media-thumb"
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            <img src={url} alt="Report attachment" loading="lazy" />
          </a>
        )
      )}
    </div>
  );
}
