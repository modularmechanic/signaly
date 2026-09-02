import type { JackRef } from './types';

export function connect(from: JackRef, to: JackRef): void {
  from.node.connect(to.node, from.idx, to.idx);
}

export function disconnect(from: JackRef, to: JackRef): void {
  try {
    from.node.disconnect(to.node, from.idx, to.idx);
  } catch {
    /* edge was not connected */
  }
}
