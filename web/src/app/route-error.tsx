import { AlertTriangle, Home, RotateCw } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router'

import { ZonaOSLogo } from '@/components/brand/zona-logo'
import { Button } from '@/components/ui/button'

/** Shown when a screen crashes, instead of the default React Router page. */
export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  if (import.meta.env.DEV) console.error(error)
  return (
    <main className="min-h-dvh bg-slate-950 text-white flex items-center justify-center p-4">
      <div role="alert" className="max-w-md text-center space-y-4">
        <ZonaOSLogo size="sm" className="mb-4" />
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-400" aria-hidden="true" />
        <h1 className="text-2xl font-bold">{notFound ? 'Página no encontrada' : 'Algo salió mal'}</h1>
        <p className="text-slate-400">
          {notFound
            ? 'La página que buscas no existe.'
            : 'Ocurrió un error inesperado al mostrar esta pantalla. Puedes reintentar o volver al inicio.'}
        </p>
        <div className="flex justify-center gap-2">
          {!notFound && (
            <Button onClick={() => window.location.reload()} >
              <RotateCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Reintentar
            </Button>
          )}
          <Button asChild variant="outline" className="bg-slate-900 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800">
            <a href="/">
              <Home className="w-4 h-4 mr-2" aria-hidden="true" />
              Ir al inicio
            </a>
          </Button>
        </div>
      </div>
    </main>
  )
}
