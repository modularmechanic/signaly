/** Throwing checkers: the first failure aborts and its message reaches the builder chat. */
export function bad(message: string): never {
  throw new Error(message);
}

/** `null` is how a strict JSON-schema provider spells "absent". */
export const opt = (v: unknown): unknown => (v === null ? undefined : v);

export function obj(v: unknown, at: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) bad(`${at} must be an object`);
  return v as Record<string, unknown>;
}

export function str(v: unknown, at: string, max: number): string {
  if (typeof v !== 'string' || v.length === 0 || v.length > max)
    bad(`${at} must be a string of 1..${max} chars`);
  return v as string;
}

export function num(v: unknown, at: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) bad(`${at} must be a finite number`);
  return v as number;
}

export function bool(v: unknown, at: string): boolean {
  if (typeof v !== 'boolean') bad(`${at} must be a boolean`);
  return v as boolean;
}

export function list(v: unknown, at: string, max: number): unknown[] {
  if (!Array.isArray(v)) bad(`${at} must be an array`);
  if (v.length > max) bad(`${at} allows at most ${max} entries`);
  return v as unknown[];
}

export function pick(v: unknown, at: string, allowed: readonly string[]): string {
  const s = str(v, at, 32);
  if (!allowed.includes(s)) bad(`${at} must be one of: ${allowed.join(', ')}`);
  return s;
}

export function unit(v: unknown, at: string): number {
  const n = num(v, at);
  if (n < 0 || n > 1) bad(`${at} must be within 0..1`);
  return n;
}
