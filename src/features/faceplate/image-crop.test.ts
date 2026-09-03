import { afterEach, describe, expect, it, vi } from 'vitest';
import { cropToFaceplate } from './image-crop';

const drawImage = vi.fn();
const convertToBlob = vi.fn(() => Promise.resolve(new Blob(['x'], { type: 'image/webp' })));

class FakeCanvas {
  ctx: { drawImage: typeof drawImage; canvas: FakeCanvas };
  constructor(
    public width: number,
    public height: number,
  ) {
    this.ctx = { drawImage, canvas: this };
  }
  getContext(): FakeCanvas['ctx'] {
    return this.ctx;
  }
  convertToBlob = convertToBlob;
}

function stubImaging(width = 1000, height = 800): { close: ReturnType<typeof vi.fn> } {
  const bitmap = { width, height, close: vi.fn() };
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(() => Promise.resolve(bitmap)),
  );
  vi.stubGlobal('OffscreenCanvas', FakeCanvas);
  return bitmap;
}

afterEach(() => {
  vi.unstubAllGlobals();
  drawImage.mockClear();
  convertToBlob.mockClear();
});

describe('cropToFaceplate', () => {
  it('passes the source rect and a 2x destination to drawImage', async () => {
    const bitmap = stubImaging();
    const blob = await cropToFaceplate(
      new Blob(['src']),
      { sx: 10, sy: 20, sw: 300, sh: 200 },
      { w: 90, h: 380 },
    );
    expect(blob.type).toBe('image/webp');
    const [source, sx, sy, sw, sh, dx, dy, dw, dh] = drawImage.mock.calls[0] as number[];
    expect(source).toBe(bitmap);
    expect([sx, sy, sw, sh]).toEqual([10, 20, 300, 200]);
    expect([dx, dy, dw, dh]).toEqual([0, 0, 180, 760]);
    expect(convertToBlob).toHaveBeenCalledWith({ type: 'image/webp', quality: 0.85 });
    expect(bitmap.close).toHaveBeenCalled();
  });

  it('rejects an oversized source image', async () => {
    stubImaging(9000, 9000);
    await expect(
      cropToFaceplate(new Blob(['s']), { sx: 0, sy: 0, sw: 1, sh: 1 }, { w: 10, h: 10 }),
    ).rejects.toThrow(/larger than 8192px/);
  });

  it('rejects a degenerate crop rect', async () => {
    stubImaging();
    await expect(
      cropToFaceplate(new Blob(['s']), { sx: 0, sy: 0, sw: 0, sh: 10 }, { w: 10, h: 10 }),
    ).rejects.toThrow(/positive, finite box/);
  });

  it('says so when the browser has no OffscreenCanvas', async () => {
    await expect(
      cropToFaceplate(new Blob(['s']), { sx: 0, sy: 0, sw: 1, sh: 1 }, { w: 1, h: 1 }),
    ).rejects.toThrow(/unavailable/);
  });
});
