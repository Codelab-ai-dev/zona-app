import { screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { match1 } from '../test-fixtures'
import { MatchPosterGenerator } from './match-poster-generator'

const html2canvasMock = vi.hoisted(() => vi.fn())
vi.mock('html2canvas-pro', () => ({ default: html2canvasMock }))

describe('MatchPosterGenerator download', () => {
  it('undoes the preview zoom and dialog transform on the captured clone', async () => {
    html2canvasMock.mockResolvedValue({ toDataURL: () => 'data:image/png;base64,AAAA' })
    const { user } = renderWithProviders(
      <MatchPosterGenerator open onOpenChange={() => {}} matches={[match1]} tournamentName="Apertura" />,
    )

    await user.click(screen.getByRole('button', { name: /descargar png/i }))
    await waitFor(() => expect(html2canvasMock).toHaveBeenCalledTimes(1))

    const opts = html2canvasMock.mock.calls[0]![1] as { width: number; onclone: (doc: Document, el: HTMLElement) => void }
    expect(opts.width).toBe(900)

    // Same shape as the preview: dialog (transform) > scroller (zoom) > poster.
    const dialog = document.createElement('div')
    dialog.style.transform = 'translate(-50%, -50%)'
    const scroller = document.createElement('div')
    scroller.style.zoom = '0.58'
    const clone = document.createElement('div')
    clone.style.width = '900px'
    dialog.appendChild(scroller).appendChild(clone)

    opts.onclone(document, clone)

    expect(scroller.style.zoom).toBe('1')
    expect(dialog.style.transform).toBe('none')
    expect(clone.style.width).toBe('900px')
  })
})
