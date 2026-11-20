import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CornerDownLeft,
  Gauge,
  GitFork,
  Inbox,
  LayoutGrid,
  ListOrdered,
  MessageCircle,
  QrCode,
  Rows3,
  Search,
  Settings,
  ShieldAlert,
  Shirt,
  Target,
  Trophy,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router'

import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'

import type { NavItem } from '../area'

/** Fraction of the visible width an arrow click moves. */
const STEP = 0.7
/** Pixels a mouse must travel before a press becomes a drag (and not a click). */
const DRAG_THRESHOLD = 6

const sections: Record<string, { icon: LucideIcon; group: string }> = {
  '/admin': { icon: Gauge, group: 'General' },
  '/liga-admin': { icon: Gauge, group: 'Competición' },
  '/liga-admin/torneos': { icon: Trophy, group: 'Competición' },
  '/liga-admin/grupos': { icon: LayoutGrid, group: 'Competición' },
  '/liga-admin/fixtures': { icon: Rows3, group: 'Competición' },
  '/liga-admin/playoffs': { icon: GitFork, group: 'Competición' },
  '/liga-admin/calendario': { icon: CalendarDays, group: 'Competición' },
  '/liga-admin/resultados': { icon: ClipboardCheck, group: 'Competición' },
  '/liga-admin/tabla': { icon: ListOrdered, group: 'Competición' },
  '/liga-admin/goleadores': { icon: Target, group: 'Competición' },
  '/liga-admin/suspensiones': { icon: ShieldAlert, group: 'Competición' },
  '/liga-admin/equipos': { icon: Shirt, group: 'Equipos y jugadores' },
  '/liga-admin/solicitudes': { icon: Inbox, group: 'Equipos y jugadores' },
  '/liga-admin/verificacion': { icon: BadgeCheck, group: 'Equipos y jugadores' },
  '/liga-admin/qr-batch': { icon: QrCode, group: 'Equipos y jugadores' },
  '/liga-admin/finanzas': { icon: Wallet, group: 'Administración' },
  '/liga-admin/whatsapp': { icon: MessageCircle, group: 'Administración' },
  '/liga-admin/ajustes': { icon: Settings, group: 'Administración' },
}
const iconFor = (to: string) => sections[to]?.icon ?? LayoutGrid
const groupFor = (to: string) => sections[to]?.group ?? 'Otras secciones'

/**
 * Section navigation as a "scoreboard rail": one scrolling row where a lime
 * pill glides to the current section and a ghost pill follows the pointer.
 * It scrolls by swipe, trackpad, mouse wheel, drag or the arrows, and ⌘K / Ctrl+K
 * opens a quick jump to any section. Positions are applied to the DOM
 * directly so moving the pill never re-renders the list.
 */
export function SectionCarousel({ items }: { items: NavItem[] }) {
  const track = useRef<HTMLUListElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  const ghost = useRef<HTMLSpanElement>(null)
  const drag = useRef({ active: false, moved: false, startX: 0, startLeft: 0 })
  const { pathname } = useLocation()
  const [edges, setEdges] = useState({ start: true, end: true })
  const [paletteOpen, setPaletteOpen] = useState(false)

  const measureEdges = useCallback(() => {
    const el = track.current
    if (!el) return
    const start = el.scrollLeft <= 1
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
  }, [])

  /** Moves the lime pill under the current section; `instant` skips the glide. */
  const placePill = useCallback((instant = false) => {
    const link = currentItem(track.current)
    const el = pill.current
    if (!el) return
    if (!link) {
      el.style.opacity = '0'
      return
    }
    el.style.transition = instant ? 'none' : ''
    el.style.width = `${link.offsetWidth}px`
    el.style.transform = `translateX(${link.offsetLeft}px)`
    el.style.opacity = '1'
  }, [])

  useEffect(() => {
    const el = track.current
    if (!el) return
    const frame = requestAnimationFrame(() => {
      measureEdges()
      placePill(true)
    })
    const onResize = () => {
      measureEdges()
      placePill(true)
    }
    el.addEventListener('scroll', measureEdges, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(onResize)
    observer?.observe(el)
    // Label widths change once Inter finishes loading.
    void document.fonts?.ready.then(onResize)

    // A vertical mouse wheel scrolls the rail sideways while there is room.
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      const next = Math.min(max, Math.max(0, el.scrollLeft + e.deltaY))
      if (next === el.scrollLeft) return
      e.preventDefault()
      el.scrollLeft = next
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', measureEdges)
      el.removeEventListener('wheel', onWheel)
      observer?.disconnect()
    }
  }, [measureEdges, placePill, items.length])

  // On navigation: glide the pill and bring the section to the middle.
  useLayoutEffect(() => {
    placePill()
    const el = track.current
    const link = currentItem(el)
    if (!el || !link) return
    const left = link.offsetLeft - (el.clientWidth - link.offsetWidth) / 2
    el.scrollTo?.({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [pathname, placePill])

  // ⌘K / Ctrl+K opens the quick jump from anywhere in the dashboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const scrollBy = (direction: 1 | -1) => {
    const el = track.current
    el?.scrollBy?.({ left: direction * el.clientWidth * STEP, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  const showGhost = (target: HTMLElement) => {
    const el = ghost.current
    if (!el || drag.current.moved) return
    el.style.width = `${target.offsetWidth}px`
    el.style.transform = `translateX(${target.offsetLeft}px)`
    el.style.opacity = '1'
  }
  const hideGhost = () => {
    if (ghost.current) ghost.current.style.opacity = '0'
  }

  // Mouse drag-to-scroll; touch and pens keep native scrolling.
  const onPointerDown = (e: ReactPointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !track.current) return
    drag.current = { active: true, moved: false, startX: e.clientX, startLeft: track.current.scrollLeft }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLUListElement>) => {
    const d = drag.current
    const el = track.current
    if (!d.active || !el) return
    const dx = e.clientX - d.startX
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return
    if (!d.moved) {
      d.moved = true
      el.setPointerCapture(e.pointerId)
      el.dataset.dragging = 'true'
      hideGhost()
    }
    el.scrollLeft = d.startLeft - dx
  }
  const endDrag = (e: ReactPointerEvent<HTMLUListElement>) => {
    const el = track.current
    drag.current.active = false
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    if (el) delete el.dataset.dragging
  }
  // A drag must not end as a click on the link under the pointer.
  const onClickCapture = (e: ReactMouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      drag.current.moved = false
    }
  }

  return (
    <div className="hidden items-stretch gap-3 md:flex">
      <nav aria-label="Panel" className="relative min-w-0 flex-1">
        <div className="relative flex items-center gap-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
          <ArrowButton direction={-1} disabled={edges.start} onClick={() => scrollBy(-1)} />
          <div className="relative min-w-0 flex-1">
            <ul
              ref={track}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerLeave={hideGhost}
              onClickCapture={onClickCapture}
              className="relative flex gap-1 overflow-x-auto [scrollbar-width:none] data-[dragging=true]:cursor-grabbing data-[dragging=true]:select-none [&::-webkit-scrollbar]:hidden"
            >
              {/* Ghost pill (hover) and lime pill (current section) live in the
                  scrolling content, so they travel with it. */}
              <span
                ref={ghost}
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 rounded-xl bg-slate-800 opacity-0 transition-[transform,width,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]"
              />
              <span
                ref={pill}
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 rounded-xl bg-gol-400 opacity-0 shadow-[0_8px_24px_-10px_rgb(163_255_18/0.55)] transition-[transform,width,opacity] duration-[420ms] ease-[cubic-bezier(.34,1.32,.64,1)]"
              />
              {items.map((item) => {
                const Icon = iconFor(item.to)
                return (
                  <li key={item.to} className="relative shrink-0" onPointerEnter={(e) => showGhost(e.currentTarget)}>
                    <NavLink
                      to={item.to}
                      end
                      draggable={false}
                      className={({ isActive }) =>
                        cn(
                          'group relative z-10 flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-medium text-slate-400 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gol-400',
                          isActive && 'font-semibold text-slate-950 delay-150 hover:text-slate-950',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            aria-hidden="true"
                            className={cn(
                              'size-3.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]',
                              isActive ? 'scale-110 -rotate-6' : 'text-slate-500 group-hover:scale-110 group-hover:text-gol-400',
                            )}
                          />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
            <span
              aria-hidden="true"
              className={cn('pointer-events-none absolute inset-y-0 left-0 z-20 w-12 bg-gradient-to-r from-slate-900 to-transparent transition-opacity duration-200', edges.start && 'opacity-0')}
            />
            <span
              aria-hidden="true"
              className={cn('pointer-events-none absolute inset-y-0 right-0 z-20 w-12 bg-gradient-to-l from-slate-900 to-transparent transition-opacity duration-200', edges.end && 'opacity-0')}
            />
          </div>
          <ArrowButton direction={1} disabled={edges.end} onClick={() => scrollBy(1)} />
        </div>
      </nav>
      {/* Quick jump lives beside the rail, not inside it. */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-keyshortcuts="Meta+K Control+K"
        className="group flex shrink-0 items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/90 px-3.5 text-sm text-slate-400 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-colors duration-200 hover:border-gol-400/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gol-400"
      >
        <Search className="size-4 transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:scale-110 group-hover:text-gol-400" aria-hidden="true" />
        <span className="hidden xl:inline">Buscar sección</span>
        <span className="sr-only xl:hidden">Buscar sección</span>
        <kbd className="hidden rounded-md border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-400 lg:inline">
          {isMac() ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>
      <SectionPalette items={items} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

function SectionPalette({ items, open, onOpenChange }: { items: NavItem[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const groups = items.reduce<Map<string, NavItem[]>>((acc, item) => {
    const g = groupFor(item.to)
    acc.set(g, [...(acc.get(g) ?? []), item])
    return acc
  }, new Map())

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ir a una sección"
      description="Escribe el nombre de la sección y presiona Enter"
      className="max-w-lg rounded-2xl border-slate-800 bg-slate-900"
    >
      <CommandInput placeholder="Buscar sección…" />
      <CommandList className="max-h-[360px]">
        <CommandEmpty>No hay secciones con ese nombre.</CommandEmpty>
        {[...groups].map(([group, entries]) => (
          <CommandGroup key={group} heading={group}>
            {entries.map((item) => {
              const Icon = iconFor(item.to)
              const current = item.to === pathname
              return (
                <CommandItem
                  key={item.to}
                  value={`${item.label} ${group}`}
                  onSelect={() => {
                    onOpenChange(false)
                    void navigate(item.to)
                  }}
                  className="rounded-xl data-[selected=true]:bg-gol-400/10 data-[selected=true]:text-white"
                >
                  <Icon className={cn('size-4', current ? 'text-gol-400' : 'text-slate-500')} aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {current ? (
                    <span className="rounded-full bg-gol-400/15 px-2 py-0.5 text-[11px] font-medium text-gol-300">Actual</span>
                  ) : (
                    <CornerDownLeft className="size-3.5 opacity-0 [[data-selected=true]_&]:opacity-60" aria-hidden="true" />
                  )}
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}

function ArrowButton({ direction, disabled, onClick }: { direction: 1 | -1; disabled: boolean; onClick: () => void }) {
  const Icon = direction === 1 ? ChevronRight : ChevronLeft
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      tabIndex={-1}
      aria-label={direction === 1 ? 'Ver más secciones' : 'Ver secciones anteriores'}
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-[opacity,transform,color,background-color] duration-200 hover:bg-slate-800 hover:text-gol-400 active:scale-90 disabled:pointer-events-none disabled:scale-75 disabled:opacity-0"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}

/** The current section's `li`: positions are measured on it, since it is laid out in the scrolling row. */
function currentItem(track: HTMLElement | null) {
  return track?.querySelector<HTMLElement>('a[aria-current="page"]')?.closest('li') ?? null
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

function isMac() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
}
