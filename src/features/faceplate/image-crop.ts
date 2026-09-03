const MAX_SRC_PX = 8192;
const SCALE = 2;

/** Source-crop and dest-scale in one 9-arg drawImage; exported at 2x for retina panels. */
export async function cropToFaceplate(
  src: Blob,
  crop: { sx: number; sy: number; sw: number; sh: number },
  out: { w: number; h: number },
): Promise<Blob> {
  // Read at call time: jsdom has neither, and tests stub them.
  const decode = globalThis.createImageBitmap as typeof createImageBitmap | undefined;
  const Canvas = globalThis.OffscreenCanvas as typeof OffscreenCanvas | undefined;
  if (!decode || !Canvas) throw new Error('image cropping is unavailable in this browser');
  const w = Math.round(out.w * SCALE);
  const h = Math.round(out.h * SCALE);
  if (!(w >= 1) || !(h >= 1)) throw new Error('output size must be positive');
  if (
    ![crop.sx, crop.sy, crop.sw, crop.sh].every((n) => Number.isFinite(n)) ||
    crop.sw <= 0 ||
    crop.sh <= 0
  ) {
    throw new Error('crop rectangle must be a positive, finite box');
  }
  const bitmap = await decode(src);
  try {
    if (bitmap.width > MAX_SRC_PX || bitmap.height > MAX_SRC_PX) {
      throw new Error(`source image is larger than ${MAX_SRC_PX}px`);
    }
    const ctx = new Canvas(w, h).getContext('2d');
    if (!ctx) throw new Error('2D canvas is unavailable');
    ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
    return await ctx.canvas.convertToBlob({ type: 'image/webp', quality: 0.85 });
  } finally {
    bitmap.close();
  }
}
