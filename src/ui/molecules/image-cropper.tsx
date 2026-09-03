import { useRef, useState, type PointerEvent, type ReactNode } from 'react';

export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/** fit letterboxes (the rect covers the image), crop insets, stretch takes everything. */
export function cropPreset(mode: CropMode, w: number, h: number, aspect: number): CropRect {
  if (mode === 'stretch') return { sx: 0, sy: 0, sw: w, sh: h };
  let sw = w;
  let sh = w / aspect;
  if (mode === 'fit' ? sh < h : sh > h) {
    sh = h;
    sw = h * aspect;
  }
  return { sx: (w - sw) / 2, sy: (h - sh) / 2, sw, sh };
}

export interface ImageCropperProps {
  url: string;
  /** natural source pixels */
  width: number;
  height: number;
  /** locked width/height ratio of the crop box */
  aspect: number;
  rect: CropRect;
  onChange: (rect: CropRect) => void;
}

export type CropMode = 'fit' | 'stretch' | 'crop';

const MIN_PX = 8;
const pct = (n: number, of: number): string => `${(n / of) * 100}%`;

/** Drag a panel-aspect rectangle over the source image. Anchored at the press point. */
export function ImageCropper({ url, width, height, aspect, rect, onChange }: ImageCropperProps): ReactNode {
  const frame = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const at = (e: PointerEvent<HTMLDivElement>): { x: number; y: number } => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || box.width <= 0 || box.height <= 0) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(width, ((e.clientX - box.left) / box.width) * width)),
      y: Math.max(0, Math.min(height, ((e.clientY - box.top) / box.height) * height)),
    };
  };

  const down = (e: PointerEvent<HTMLDivElement>): void => {
    start.current = at(e);
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: PointerEvent<HTMLDivElement>): void => {
    const from = start.current;
    if (!dragging || !from) return;
    const to = at(e);
    let sw = Math.max(MIN_PX, to.x - from.x);
    sw = Math.min(sw, width - from.x);
    let sh = sw / aspect;
    if (from.y + sh > height) {
      sh = height - from.y;
      sw = sh * aspect;
    }
    if (sw >= MIN_PX && sh >= MIN_PX) onChange({ sx: from.x, sy: from.y, sw, sh });
  };

  const up = (): void => {
    start.current = null;
    setDragging(false);
  };

  return (
    <div
      className="cropper"
      ref={frame}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <img src={url} alt="Faceplate source" draggable={false} />
      <div
        className="crop-rect"
        style={{
          left: pct(rect.sx, width),
          top: pct(rect.sy, height),
          width: pct(rect.sw, width),
          height: pct(rect.sh, height),
        }}
      />
    </div>
  );
}
