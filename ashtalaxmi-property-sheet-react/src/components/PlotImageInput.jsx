import React, { useRef, useState } from 'react';

const OK_TYPES = /^image\/(jpeg|png|webp)$/;
const MAX_SIDE = 2000; // large photos are scaled down so the PDF stays light

/** Reads an image file and returns { src (JPEG data URL), info } or throws. */
function readImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const r = Math.min(1, MAX_SIDE / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * r);
      c.height = Math.round(im.naturalHeight * r);
      const x = c.getContext('2d');
      x.fillStyle = '#fff';
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const mb = file.size / 1048576;
      resolve({
        src: c.toDataURL('image/jpeg', 0.9),
        name: file.name,
        info: `${im.naturalWidth} × ${im.naturalHeight} px · ${mb.toFixed(mb < 1 ? 2 : 1)} MB`,
      });
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('not an image'));
    };
    im.src = url;
  });
}

/** Optional single image (location map or site plan). value: {src,name,info} | null */
export default function PlotImageInput({ value, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState(false);
  const [over, setOver] = useState(false);

  const load = async (file) => {
    if (!file) return;
    if (!OK_TYPES.test(file.type)) {
      setError(true);
      inputRef.current.value = '';
      return;
    }
    try {
      onChange(await readImage(file));
      setError(false);
    } catch {
      setError(true);
      inputRef.current.value = '';
    }
  };

  const remove = () => {
    onChange(null);
    setError(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const stop = (e) => {
    e.preventDefault();
  };

  return (
    <div className={`field full${error ? ' has-err' : ''}`} data-f="plotImg">
      <span className="lbl">
        Location map or site plan <span className="hint">optional · one image (JPG, PNG or WEBP)</span>
      </span>

      <label
        className={`drop${over ? ' over' : ''}`}
        id="dropZone"
        htmlFor="plotImg"
        hidden={!!value}
        onDragEnter={(e) => {
          stop(e);
          setOver(true);
        }}
        onDragOver={(e) => {
          stop(e);
          setOver(true);
        }}
        onDragLeave={(e) => {
          stop(e);
          setOver(false);
        }}
        onDrop={(e) => {
          stop(e);
          setOver(false);
          load(e.dataTransfer.files && e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          id="plotImg"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => load(e.target.files[0])}
        />
        <span className="drop-in">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
          </svg>
          <b>Choose an image</b>
          <small>or drag it here</small>
        </span>
      </label>

      {value && (
        <div className="thumb" id="thumbWrap">
          <img id="thumbImg" src={value.src} alt="Selected plot image" />
          <div className="thumb-meta">
            <b id="thumbName">{value.name}</b>
            <small id="thumbInfo">{value.info}</small>
            <div className="thumb-actions">
              <button type="button" className="linkbtn" id="changeImg" onClick={() => inputRef.current.click()}>
                Change
              </button>
              <button type="button" className="linkbtn" id="removeImg" onClick={remove}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="err">That file isn't an image. Choose a JPG, PNG or WEBP file.</div>
    </div>
  );
}
