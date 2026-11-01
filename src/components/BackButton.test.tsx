import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BackButton } from './BackButton'

describe('BackButton', () => {
  it('falls back to the given page when there is no history to go back to', () => {
    render(
      <MemoryRouter initialEntries={['/app/body']}>
        <Routes>
          <Route path="/app/body" element={<BackButton fallback="/app/history" />} />
          <Route path="/app/history" element={<p>History page</p>} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('History page')).toBeInTheDocument()
  })
})
