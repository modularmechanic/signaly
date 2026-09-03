import { clear, del, get, set } from 'idb-keyval';

// Faceplate images are Blobs — far past localStorage's 5 MB synchronous budget.
const key = (id: string): string => `faceplate:${id}`;

export function newImageId(): string {
  return crypto.randomUUID();
}

export function saveImage(id: string, blob: Blob): Promise<void> {
  return set(key(id), blob);
}

export function getImage(id: string): Promise<Blob | undefined> {
  return get<Blob>(key(id));
}

export function removeImage(id: string): Promise<void> {
  return del(key(id));
}

export function clearImages(): Promise<void> {
  return clear();
}
