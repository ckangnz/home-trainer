import { describe, expect, it } from 'vitest'
import { CODE_ALPHABET, formatCode, generateCode, parseCode, sharePath } from './code'

describe('share codes', () => {
  it('generates 8 characters from the Crockford alphabet', () => {
    const code = generateCode((bytes) => bytes.map((_, index) => index * 37))
    expect(code).toHaveLength(8)
    expect([...code].every((character) => CODE_ALPHABET.includes(character))).toBe(true)
    expect(generateCode()).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/)
  })

  it('formats codes for humans', () => {
    expect(formatCode('7KQ2M9XP')).toBe('HT-7KQ2-M9XP')
  })

  it('parses codes typed or pasted in many forms', () => {
    for (const input of ['HT-7KQ2-M9XP', 'ht 7kq2 m9xp', '7KQ2M9XP', '  7kq2-m9xp ', 'https://hometrainer.web.app/r/7KQ2M9XP', 'Code: HT-7KQ2-M9XP']) {
      expect(parseCode(input)).toBe('7KQ2M9XP')
    }
  })

  it('maps confusable characters', () => {
    expect(parseCode('HT-OIL0-UVWX')).toBe('0110VVWX')
  })

  it('rejects malformed codes', () => {
    expect(parseCode('')).toBeNull()
    expect(parseCode('HT-7KQ2')).toBeNull()
    expect(parseCode('7KQ2M9XPZ')).toBeNull()
    expect(parseCode('7KQ2M9X!')).toBeNull()
  })

  it('builds share paths', () => {
    expect(sharePath('7KQ2M9XP')).toBe('/r/7KQ2M9XP')
  })
})
