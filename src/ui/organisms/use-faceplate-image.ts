import { useEffect, useState } from 'react';
import { getImage } from '../../storage/image-store';
import { getUserModule } from '../../storage/user-module-store';

const PREFIX = 'user:';

/** Blob URL of a user module's faceplate image, or null. Built-ins never have one. */
export function useFaceplateImage(defId: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!defId.startsWith(PREFIX)) return;
    const imageId = getUserModule(defId.slice(PREFIX.length))?.faceplateImageId;
    if (imageId === undefined) return;
    let objectUrl: string | null = null;
    let live = true;
    void getImage(imageId).then((blob) => {
      if (!blob || !live) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [defId]);
  return url;
}
