import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InstallPrompt } from './install-prompt'

function fireInstallPrompt() {
  const prompt = vi.fn().mockResolvedValue(undefined)
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  })
  act(() => {
    window.dispatchEvent(event)
  })
  return prompt
}

describe('InstallPrompt', () => {
  beforeEach(() => localStorage.clear())

  it('offers to install when the browser allows it', async () => {
    render(<InstallPrompt />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const prompt = fireInstallPrompt()

    await userEvent.click(await screen.findByRole('button', { name: 'Instalar' }))
    expect(prompt).toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('remembers a dismissal for 3 days', async () => {
    const { unmount } = render(<InstallPrompt />)
    fireInstallPrompt()
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    unmount()

    render(<InstallPrompt />)
    fireInstallPrompt()
    expect(screen.queryByRole('dialog', { name: 'Instalar Zona Gol' })).not.toBeInTheDocument()
  })
})
