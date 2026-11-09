import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { SearchField } from './SearchField'

function LaggingParent({ onQuery }: { onQuery: (query: string) => void }) {
  const [lagging, setLagging] = useState('')
  return (
    <>
      <SearchField label="Search" value={lagging} onChange={onQuery} />
      <button type="button" onClick={() => setLagging('squat')}>
        external
      </button>
    </>
  )
}

describe('SearchField', () => {
  it('keeps typed text when the parent value has not caught up, so Korean composition is not interrupted', () => {
    const seen: string[] = []
    render(<LaggingParent onQuery={(query) => seen.push(query)} />)
    const input = screen.getByRole('searchbox', { name: 'Search' })
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'ㅍ' } })
    fireEvent.change(input, { target: { value: '파' } })
    fireEvent.change(input, { target: { value: '팔' } })
    fireEvent.compositionEnd(input)
    expect(input).toHaveValue('팔')
    expect(seen.at(-1)).toBe('팔')
  })

  it('still follows value changes that did not come from typing', () => {
    render(<LaggingParent onQuery={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: 'external' }))
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('squat')
  })
})
