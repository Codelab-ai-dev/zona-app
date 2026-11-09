import type { NavItem } from '../area'
import type { LeagueCapabilities } from './league-capabilities'

/**
 * Tab labels and order of the original dashboard (one tab strip per role).
 * Routes not listed keep their own label and go last.
 */
const tabs: { to: string; label: string }[] = [
  { to: '/admin', label: 'Resumen' },
  { to: '/liga-admin', label: 'Resumen' },
  { to: '/liga-admin/torneos', label: 'Torneos' },
  { to: '/liga-admin/equipos', label: 'Equipos' },
  { to: '/liga-admin/solicitudes', label: 'Solicitudes' },
  { to: '/liga-admin/grupos', label: 'Grupos' },
  { to: '/liga-admin/fixtures', label: 'Jornadas' },
  { to: '/liga-admin/playoffs', label: 'Liguilla' },
  { to: '/liga-admin/calendario', label: 'Calendario' },
  { to: '/liga-admin/resultados', label: 'Resultados' },
  { to: '/liga-admin/tabla', label: 'Posiciones' },
  { to: '/liga-admin/goleadores', label: 'Goleadores' },
  { to: '/liga-admin/suspensiones', label: 'Suspensiones' },
  { to: '/liga-admin/verificacion', label: 'Verificación' },
  { to: '/liga-admin/qr-batch', label: 'Gestión QR' },
  { to: '/liga-admin/finanzas', label: 'Finanzas' },
  { to: '/liga-admin/whatsapp', label: 'WhatsApp' },
  { to: '/liga-admin/ajustes', label: 'Configuración' },
  { to: '/mi-equipo', label: 'Mi Equipo' },
  { to: '/play/admin', label: 'Zona Play' },
]

export function orderTabs(items: NavItem[]): NavItem[] {
  const known = tabs
    .map((t) => {
      const item = items.find((i) => i.to === t.to)
      return item ? { ...item, label: t.label } : null
    })
    .filter((i): i is NavItem => i !== null)
  const rest = items.filter((i) => !tabs.some((t) => t.to === i.to))
  return [...known, ...rest]
}

/** Hides tabs the leagues can't use, as the original did (plan features and tournament formats). */
export function gateTabs(items: NavItem[], caps: Pick<LeagueCapabilities, 'has' | 'formats'>): NavItem[] {
  const onlyKnockout = caps.formats.size > 0 && !caps.formats.has('league') && !caps.formats.has('group_knockout')
  const hidden: Record<string, boolean> = {
    '/liga-admin/qr-batch': !caps.has('qr_codes'),
    '/liga-admin/finanzas': !caps.has('finance'),
    '/liga-admin/grupos': !caps.formats.has('group_knockout'),
    '/liga-admin/fixtures': onlyKnockout,
  }
  return items.filter((item) => !hidden[item.to])
}
