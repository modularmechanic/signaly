import type { PatchFile } from '../engine/snapshot';

/** The example patches bundled with the app, in file order. Each `*.signaly.json` here is a
    plain exported patch — the same format Import accepts — so a saved rack can become an example
    by dropping the file in this directory. */
const files = import.meta.glob<PatchFile>('./*.signaly.json', { eager: true, import: 'default' });

export interface ExamplePatch {
  id: string;
  name: string;
  snapshot: PatchFile['snapshot'];
}

export const EXAMPLES: ExamplePatch[] = Object.keys(files)
  .sort()
  .map((path) => ({ id: path, name: files[path]!.name, snapshot: files[path]!.snapshot }));
