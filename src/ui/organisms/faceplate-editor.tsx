import { useEffect, useState, type ReactNode } from 'react';
import { HP_PX, PANEL_H } from '../../core/types';
import { cropToFaceplate } from '../../features/faceplate/image-crop';
import { generateFaceplate, imageProvider } from '../../features/llm/client';
import { userModuleId, type UserModule } from '../../features/user-modules/schema';
import { layoutPanel } from '../../modules/panel-layout';
import { getImage, newImageId, saveImage } from '../../storage/image-store';
import { Button } from '../atoms/button';
import { Select } from '../atoms/select';
import { cropPreset, ImageCropper, type CropMode, type CropRect } from '../molecules/image-cropper';

const MODES: readonly CropMode[] = ['fit', 'stretch', 'crop'];
const MAX_SRC_PX = 8192;
const NO_RECT: CropRect = { sx: 0, sy: 0, sw: 1, sh: 1 };

interface Source {
  blob: Blob;
  url: string;
  w: number;
  h: number;
}

/** Decode through the browser so a malformed file fails before any canvas is allocated. */
async function openImage(blob: Blob): Promise<Source | { error: string }> {
  const url = URL.createObjectURL(blob);
  const el = new Image();
  const ok = await new Promise<boolean>((done) => {
    el.onload = () => done(true);
    el.onerror = () => done(false);
    el.src = url;
  });
  if (!ok || el.naturalWidth < 1 || el.naturalHeight < 1) {
    URL.revokeObjectURL(url);
    return { error: 'That file could not be decoded as an image.' };
  }
  if (el.naturalWidth > MAX_SRC_PX || el.naturalHeight > MAX_SRC_PX) {
    URL.revokeObjectURL(url);
    return { error: `That image is larger than ${MAX_SRC_PX}px.` };
  }
  return { blob, url, w: el.naturalWidth, h: el.naturalHeight };
}

export interface FaceplateEditorProps {
  um: UserModule;
  onChange: (um: UserModule) => void;
}

export function FaceplateEditor({ um, onChange }: FaceplateEditorProps): ReactNode {
  const [src, setSrc] = useState<Source | null>(null);
  const [mode, setMode] = useState<CropMode>('fit');
  const [drag, setDrag] = useState<CropRect | null>(null);
  const [applied, setApplied] = useState<{ id: string; url: string } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const out = { w: um.def.hp * HP_PX, h: PANEL_H };
  const aspect = out.w / out.h;
  // Any stored key that can generate images will do — not just the one used for chat.
  const imageBy = imageProvider();
  const canGen = imageBy !== null;
  const imageId = um.faceplateImageId;
  const rect = src ? (mode === 'crop' && drag) || cropPreset(mode, src.w, src.h, aspect) : NO_RECT;
  const appliedUrl = applied && applied.id === imageId ? applied.url : '';

  useEffect(() => {
    if (!src) return;
    return () => URL.revokeObjectURL(src.url);
  }, [src]);

  useEffect(() => {
    if (!imageId) return;
    let live = true;
    let made = '';
    void getImage(imageId).then((blob) => {
      if (!live || !blob) return;
      made = URL.createObjectURL(blob);
      setApplied({ id: imageId, url: made });
    });
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [imageId]);

  const open = async (blob: Blob): Promise<void> => {
    const next = await openImage(blob);
    if ('error' in next) {
      setMsg(next.error);
      return;
    }
    setMsg('');
    setDrag(null);
    setSrc(next);
  };

  const apply = async (): Promise<void> => {
    if (!src) return;
    setBusy(true);
    try {
      const blob = await cropToFaceplate(src.blob, rect, out);
      const id = newImageId();
      await saveImage(id, blob);
      onChange({ ...um, faceplateImageId: id });
      setMsg('Faceplate applied — save the module to keep it.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'the faceplate could not be created');
    } finally {
      setBusy(false);
    }
  };

  const generate = async (): Promise<void> => {
    setBusy(true);
    try {
      const r = await generateFaceplate(prompt);
      if (r instanceof Blob) await open(r);
      else setMsg('unsupported' in r ? 'This provider cannot generate images.' : r.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="builder-card">
      <h2>Faceplate</h2>
      <div className="fp-row">
        <label htmlFor="fp-file">Image file</label>
        <input
          id="fp-file"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void open(file);
          }}
        />
        <Select
          value={mode}
          options={MODES}
          onChange={(v) => {
            setDrag(null);
            setMode(MODES.find((m) => m === v) ?? 'fit');
          }}
          label="Mode"
        />
        <Button disabled={busy || !src} onClick={() => void apply()}>
          Apply
        </Button>
      </div>
      <div className="fp-row">
        <label htmlFor="fp-prompt">Image prompt</label>
        <input id="fp-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <Button
          disabled={busy || !canGen || !prompt.trim()}
          title={
            canGen
              ? `Generates with ${imageBy}.`
              : 'Add a Gemini or OpenAI key in Settings to generate images.'
          }
          onClick={() => void generate()}
        >
          Generate
        </Button>
      </div>
      {src ? (
        <ImageCropper
          url={src.url}
          width={src.w}
          height={src.h}
          aspect={aspect}
          rect={rect}
          onChange={setDrag}
        />
      ) : null}
      {appliedUrl ? (
        <figure className="fp-preview" style={{ width: out.w, height: out.h }}>
          <img src={appliedUrl} alt={`Faceplate for ${um.slug}`} width={out.w} height={out.h} />
          {layoutPanel({ ...um.def, id: userModuleId(um.slug) }).nodes.map((n) => (
            <span
              key={n.id}
              className="fp-node"
              style={{
                left: `${n.x * 100}%`,
                top: `${n.y * 100}%`,
                width: `${n.w * 100}%`,
                height: `${n.h * 100}%`,
              }}
            />
          ))}
        </figure>
      ) : null}
      <p className="builder-note">
        Controls can be moved by asking the chat to add panel coordinates, e.g. “put the FREQ knob over the
        big dial at the top”.
      </p>
      <p className="editor-msg" aria-live="polite">
        {msg}
      </p>
    </section>
  );
}
