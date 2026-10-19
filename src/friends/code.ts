import { CODE_ALPHABET, CODE_LENGTH } from '@/sharing/code'

const CONFUSABLE: Record<string, string> = { O: '0', I: '1', L: '1', U: 'V' }

export function formatFriendCode(code: string): string {
  return `FR-${code.slice(0, 4)}-${code.slice(4)}`
}

export function parseFriendCode(input: string): string | null {
  const fromLink = input.match(/\/friends\/add\/([0-9A-Za-z-]+)/)
  const fromText = input.match(/\bFR[-\s]*([0-9A-Za-z]{4})[-\s]*([0-9A-Za-z]{4})\b/i)
  const source = fromLink ? fromLink[1] : fromText ? `${fromText[1]}${fromText[2]}` : input
  let raw = source.toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (raw.startsWith('FR') && raw.length === CODE_LENGTH + 2) {
    raw = raw.slice(2)
  }
  const normalized = [...raw].map((character) => CONFUSABLE[character] ?? character).join('')
  if (normalized.length !== CODE_LENGTH || [...normalized].some((character) => !CODE_ALPHABET.includes(character))) {
    return null
  }
  return normalized
}

export function friendInvitePath(code: string): string {
  return `/app/friends/add/${code}`
}

export function requestId(from: string, to: string): string {
  return `${from}_${to}`
}
