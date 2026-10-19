import { describe, expect, it } from 'vitest'
import { formatFriendCode, friendInvitePath, parseFriendCode, requestId } from './code'
import { cleanName, cleanPhoto, parseFriend, parseOwnProfile, parseRequest } from './models'

describe('friend codes', () => {
  it('formats and parses codes, links, and pasted invites', () => {
    expect(formatFriendCode('7KQ2M9XP')).toBe('FR-7KQ2-M9XP')
    expect(parseFriendCode('FR-7KQ2-M9XP')).toBe('7KQ2M9XP')
    expect(parseFriendCode('fr 7kq2 m9xp')).toBe('7KQ2M9XP')
    expect(parseFriendCode(`Add me https://example.com${friendInvitePath('7KQ2M9XP')}`)).toBe('7KQ2M9XP')
    expect(parseFriendCode('My code is FR-7KQ2-M9XP, thanks')).toBe('7KQ2M9XP')
    expect(parseFriendCode('FR-OKQ2-M9XP')).toBe('0KQ2M9XP')
    expect(parseFriendCode('nope')).toBeNull()
    expect(requestId('a', 'b')).toBe('a_b')
  })
})

describe('friend models', () => {
  it('cleans names and photos', () => {
    expect(cleanName('  ')).toBe('HomeTrainer user')
    expect(cleanName('Coach Kim')).toBe('Coach Kim')
    expect(cleanPhoto('http://insecure.example/a.png')).toBeUndefined()
    expect(cleanPhoto('https://lh3.googleusercontent.com/a')).toBe('https://lh3.googleusercontent.com/a')
  })

  it('parses requests only when the id matches the pair', () => {
    const data = { from: 'a', fromName: 'Ann', to: 'b', toName: 'Ben', createdAt: '2026-10-19T00:00:00Z' }
    expect(parseRequest('a_b', data)).toMatchObject({ from: { uid: 'a', displayName: 'Ann' }, to: { uid: 'b' } })
    expect(parseRequest('b_a', data)).toBeNull()
  })

  it('parses friends and profiles defensively', () => {
    expect(parseFriend('b', { uid: 'b', displayName: 'Ben', since: 'x' })).toMatchObject({ uid: 'b', displayName: 'Ben' })
    expect(parseFriend('b', { uid: 'c', displayName: 'Ben', since: 'x' })).toBeNull()
    expect(parseOwnProfile('a', { displayName: 'Ann', friendCode: '7KQ2M9XP' })).toMatchObject({ friendCode: '7KQ2M9XP' })
    expect(parseOwnProfile('a', { displayName: 'Ann', friendCode: 'bad' })).toBeNull()
  })
})
