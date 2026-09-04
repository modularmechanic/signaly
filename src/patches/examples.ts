import type { PatchFile } from '../engine/snapshot';

/** The example patches bundled with the app, in file order. Each `*.signaly.json` here is a
    plain exported patch — the same format Import accepts — so a saved rack can become an example
    by dropping the file in this directory. The first tag is the genre the menu groups by. */
const files = import.meta.glob<PatchFile>('./*.signaly.json', { eager: true, import: 'default' });

export interface ExamplePatch {
  id: string;
  name: string;
  tags: string[];
  snapshot: PatchFile['snapshot'];
}

export const EXAMPLES: ExamplePatch[] = Object.keys(files)
  .sort()
  .map((path) => ({
    id: path,
    name: files[path]!.name,
    tags: files[path]!.tags ?? [],
    snapshot: files[path]!.snapshot,
  }));

/** Examples grouped under their genre, in the order the files declare them. */
export const EXAMPLES_BY_GENRE: { genre: string; patches: ExamplePatch[] }[] = EXAMPLES.reduce<
  { genre: string; patches: ExamplePatch[] }[]
>((groups, p) => {
  const genre = p.tags[0] ?? 'Other';
  const group = groups.find((g) => g.genre === genre);
  if (group) group.patches.push(p);
  else groups.push({ genre, patches: [p] });
  return groups;
}, []);
