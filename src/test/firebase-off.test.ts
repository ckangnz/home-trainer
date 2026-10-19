import { describe, expect, it } from 'vitest'
import { isFirebaseConfigured } from '@/data/config'

describe('test environment', () => {
  it('never talks to the real Firebase project', () => {
    expect(isFirebaseConfigured).toBe(false)
  })
})
