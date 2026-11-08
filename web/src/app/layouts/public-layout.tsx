import { Outlet } from 'react-router'

/**
 * Public pages bring their own full-page design and header (as in the
 * original app), so this layout only adds the skip link.
 */
export function PublicLayout() {
  return (
    <div className="min-h-dvh bg-slate-950 text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2">
        Saltar al contenido
      </a>
      <div id="main">
        <Outlet />
      </div>
    </div>
  )
}
