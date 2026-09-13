import { useEffect, useState } from 'react';
import { getImage } from '../../storage/image-store';

/** Blob URL for a stored faceplate image, or null. The id comes from the module's spec
    (ModuleSpec.faceplate), so "a built-in with a faceplate" is a data question rather than a
    forbidden one — this hook no longer knows what a user module is. The id is kept beside the
    url so a change of module shows nothing rather than the previous module's faceplate. */
export function useFaceplateImage(imageId: string | undefined): string | null {
  const [img, setImg] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    if (imageId === undefined) return;
    let objectUrl: string | null = null;
    let live = true;
    void getImage(imageId).then((blob) => {
      if (!blob || !live) return;
      objectUrl = URL.createObjectURL(blob);
      setImg({ id: imageId, url: objectUrl });
    });
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);
  return img !== null && img.id === imageId ? img.url : null;
}
