export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export const CODE_LENGTH = 8

const CONFUSABLE: Record<string, string> = { O: '0', I: '1', L: '1', U: 'V' }

export function generateCode(random: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes)): string {
  const bytes = random(new Uint8Array(CODE_LENGTH))
  let code = ''
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte & 31]
  }
  return code
}

export function formatCode(code: string): string {
  return `HT-${code.slice(0, 4)}-${code.slice(4)}`
}

export function parseCode(input: string): string | null {
  const fromLink = input.match(/\/r\/([0-9A-Za-z-]+)/)
  const fromText = input.match(/\bHT[-\s]*([0-9A-Za-z]{4})[-\s]*([0-9A-Za-z]{4})\b/i)
  const source = fromLink ? fromLink[1] : fromText ? `${fromText[1]}${fromText[2]}` : input
  let raw = source.toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (raw.startsWith('HT') && raw.length === CODE_LENGTH + 2) {
    raw = raw.slice(2)
  }
  const normalized = [...raw].map((character) => CONFUSABLE[character] ?? character).join('')
  if (normalized.length !== CODE_LENGTH || [...normalized].some((character) => !CODE_ALPHABET.includes(character))) {
    return null
  }
  return normalized
}

export function sharePath(code: string): string {
  return `/r/${code}`
}
