import { describe, expect, it } from 'vitest'

import type { Area } from './area'
import { areas, featureAreas } from './router'

const paths = (list: Area[]) =>
  list.flatMap((a) => [
    ...(a.publicRoutes ?? []).flatMap((r) => [r.path, ...(r.children ?? []).map((c) => c.path)]),
    ...(a.dashboardRoutes?.routes ?? []).map((r) => r.path),
  ])
const navTargets = (list: Area[]) => list.flatMap((a) => (a.nav ?? []).map((n) => n.to))

// Zona Play is deferred and its API is off by default (#51).
describe('Zona Play area', () => {
  it('is left out unless the build enables it', () => {
    const off = featureAreas(false)
    expect(paths(off).filter((p) => p?.startsWith('play'))).toEqual([])
    expect(navTargets(off)).not.toContain('/play/admin')

    const on = featureAreas(true)
    expect(paths(on)).toEqual(expect.arrayContaining(['play', 'play/watch/:videoId', 'play/admin']))
    expect(navTargets(on)).toContain('/play/admin')
  })

  it('is off in the default build', () => {
    expect(import.meta.env.VITE_PLAY_ENABLED).toBeUndefined()
    expect(navTargets(areas)).not.toContain('/play/admin')
    expect(paths(areas).filter((p) => p?.startsWith('play'))).toEqual([])
  })

  it('keeps every other area', () => {
    expect(featureAreas(true).length - featureAreas(false).length).toBe(1)
  })
})
