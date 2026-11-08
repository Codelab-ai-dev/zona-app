import { useEffect } from 'react'
import { useLocation } from 'react-router'

const BASE = 'Zona Gol'

/** Titles by path prefix (most specific first). */
const titles: [RegExp, string][] = [
  [/^\/play\/admin/, 'Zona Play Admin'],
  [/^\/play/, 'Zona Play - Revive cada jugada'],
  [/^\/liga\/[^/]+\/torneo\//, 'Torneo'],
  [/^\/liga\//, 'Liga'],
  [/^\/ligas/, 'Ligas'],
  [/^\/equipos\//, 'Equipo'],
  [/^\/login/, 'Iniciar sesión'],
  [/^\/recuperar-contrasena/, 'Recuperar contraseña'],
  [/^\/reset-password/, 'Nueva contraseña'],
  [/^\/admin/, 'Administración'],
  [/^\/liga-admin/, 'Mi liga'],
  [/^\/mi-equipo/, 'Mi equipo'],
]

/** Keeps document.title in sync with the route (the SPA has one index.html). */
export function DocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const match = titles.find(([re]) => re.test(pathname))
    document.title = match ? `${match[1]} · ${BASE}` : `${BASE} - Gestión de Ligas de Fútbol`
  }, [pathname])
  return null
}
