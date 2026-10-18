import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Field, SelectField, TextField } from './index'

describe('ui field primitives', () => {
  it('associates a text field label with its input and forwards changes', () => {
    const onChange = vi.fn()
    render(<TextField label="Set name" value="Legs" onChange={onChange} />)

    const input = screen.getByLabelText('Set name') as HTMLInputElement
    expect(input.tagName).toBe('INPUT')
    expect(input.value).toBe('Legs')

    fireEvent.change(input, { target: { value: 'Arms' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('forwards a field className onto the label wrapper so layout classes compose', () => {
    render(
      <SelectField label="Action" className="builder-list__grow" value="a" onChange={() => {}}>
        <option value="a">A</option>
      </SelectField>,
    )

    const select = screen.getByLabelText('Action')
    const wrapper = select.closest('label')
    expect(wrapper).not.toBeNull()
    expect(wrapper).toHaveClass('ui-field')
    expect(wrapper).toHaveClass('builder-list__grow')
  })

  it('wraps arbitrary controls with an associated label', () => {
    render(
      <Field label="Notes">
        <textarea className="ui-control" defaultValue="Easy day" />
      </Field>,
    )

    expect(screen.getByLabelText('Notes').tagName).toBe('TEXTAREA')
  })
})
