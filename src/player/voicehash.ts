// Shared atom hashing for the voice pack.
// Used by the runtime player (src/player/voicepack.ts) and the generation
// script (scripts/generate-voices.ts) — both must agree on the hash, so this
// module has no platform-specific imports.

export function normalizeAtom(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

// FNV-1a 32-bit, rendered as 8 hex chars.
export function hashAtom(text: string): string {
  const s = normalizeAtom(text)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
