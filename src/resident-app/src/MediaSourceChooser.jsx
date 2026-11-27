import { useRef, useState } from "react";
import { ArrowLeft, Camera, ImagePlus, Images, Video, X } from "lucide-react";
import "./MediaSourceChooser.css";

export default function MediaSourceChooser({
  buttonLabel = "Add photo or video",
  galleryAccept = "image/*,video/*",
  multiple = false,
  allowVideos = true,
  disabled = false,
  onFiles,
}) {
  const galleryRef = useRef(null);
  const photoCameraRef = useRef(null);
  const videoCameraRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [cameraChoicesOpen, setCameraChoicesOpen] = useState(false);

  const close = () => {
    setOpen(false);
    setCameraChoicesOpen(false);
  };

  const openPicker = (inputRef) => {
    close();
    inputRef.current?.click();
  };

  const handleChange = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    close();
    if (files.length) onFiles?.(files);
  };

  return (
    <div className="media-source-picker">
      <button
        className="media-source-trigger"
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => {
          setCameraChoicesOpen(false);
          setOpen((current) => !current);
        }}
      >
        <ImagePlus size={17} /> {buttonLabel}
      </button>

      {open && (
        <div className="media-source-options" role="group" aria-label="Choose where to get media">
          {!cameraChoicesOpen ? (
            <>
              <strong>Choose a source</strong>
              <button type="button" className="media-source-option" onClick={() => openPicker(galleryRef)}>
                <Images size={17} /> Choose from gallery
              </button>
              <button type="button" className="media-source-option" onClick={() => {
                if (allowVideos) setCameraChoicesOpen(true);
                else openPicker(photoCameraRef);
              }}>
                <Camera size={17} /> Use camera
              </button>
            </>
          ) : (
            <>
              <strong>Use camera</strong>
              <button type="button" className="media-source-option" onClick={() => openPicker(photoCameraRef)}>
                <Camera size={17} /> Take a photo
              </button>
              <button type="button" className="media-source-option" onClick={() => openPicker(videoCameraRef)}>
                <Video size={17} /> Record a video
              </button>
              <button type="button" className="media-source-option media-source-back" onClick={() => setCameraChoicesOpen(false)}>
                <ArrowLeft size={16} /> Back
              </button>
            </>
          )}
          <button type="button" className="media-source-cancel" onClick={close}>
            <X size={15} /> Cancel
          </button>
        </div>
      )}

      <input ref={galleryRef} className="media-source-hidden-input" type="file" accept={galleryAccept} multiple={multiple} onChange={handleChange} />
      <input ref={photoCameraRef} className="media-source-hidden-input" type="file" accept="image/*" capture="environment" onChange={handleChange} />
      {allowVideos && <input ref={videoCameraRef} className="media-source-hidden-input" type="file" accept="video/*" capture="environment" onChange={handleChange} />}
    </div>
  );
}
