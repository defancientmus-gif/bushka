let seq = 0;

/**
 * Collision-proof id generator.
 * Combines a monotonic counter (unique within a session) with time and
 * randomness, so two items created in the same millisecond never clash.
 */
export function uid(prefix = 'id'): string {
  seq = (seq + 1) % 0xffffff;
  let rand = '';
  try {
    rand = (globalThis.crypto?.randomUUID?.() ?? '').replace(/-/g, '').slice(0, 10);
  } catch {
    rand = '';
  }
  if (!rand) {
    const now = globalThis.performance?.now?.() ?? 0;
    rand = Math.floor(now * 1000).toString(36);
  }
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}${rand}`;
}
