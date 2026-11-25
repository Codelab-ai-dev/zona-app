import { AlertCircle, Check, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { useAuth } from '@/lib/auth/auth-context'

import { AuthShell, authButtonClass, authErrorClass } from './auth-shell'
import { useConsentRequest, useDecide, type ConsentRequest } from './connections'

/** Errors /oauth/authorize sends here instead of to an untrusted client. */
const authorizeErrors: Record<string, string> = {
  invalid_client: 'La aplicación que te trajo aquí no está registrada en Zona OS. Vuelve a intentarlo desde la aplicación.',
  invalid_redirect_uri: 'La dirección a la que la aplicación quería volver no coincide con la registrada. Por seguridad, no continuamos.',
}

const defaultRedirect = (url: string) => window.location.assign(url)

/**
 * OAuth consent screen (issue #50, phase C). An AI client sent the user here
 * through /oauth/authorize; approving returns them to the client with a code.
 */
export function AuthorizePage({ redirect = defaultRedirect }: { redirect?: (url: string) => void }) {
  const [params] = useSearchParams()
  const requestId = params.get('solicitud')
  const errorCode = params.get('error')
  const request = useConsentRequest(errorCode ? null : requestId)

  if (errorCode || !requestId) {
    return (
      <AuthShell eyebrow="Conectar aplicación" title="No se pudo conectar">
        <Problem message={authorizeErrors[errorCode ?? ''] ?? 'Falta la solicitud de conexión. Vuelve a iniciarla desde la aplicación.'} />
      </AuthShell>
    )
  }
  if (request.isPending) {
    return (
      <AuthShell eyebrow="Conectar aplicación" title="Autoriza el acceso">
        <p className="flex items-center gap-2 text-sm text-slate-400" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Cargando la solicitud…
        </p>
      </AuthShell>
    )
  }
  if (request.isError) {
    const message = request.error instanceof ApiError ? request.error.message : 'No se pudo cargar la solicitud. Inténtalo de nuevo.'
    return (
      <AuthShell eyebrow="Conectar aplicación" title="No se pudo conectar">
        <Problem message={message} />
      </AuthShell>
    )
  }
  return <Consent request={request.data} redirect={redirect} />
}

function Problem({ message }: { message: string }) {
  return (
    <div role="alert" className={`${authErrorClass} flex gap-2`}>
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}

function Consent({ request, redirect }: { request: ConsentRequest; redirect: (url: string) => void }) {
  const { profile } = useAuth()
  const decide = useDecide(request.id)
  const [leaving, setLeaving] = useState<boolean | null>(null)

  const submit = (approve: boolean) =>
    decide.mutate(approve, {
      onSuccess: ({ redirect_to }) => {
        setLeaving(approve)
        redirect(redirect_to)
      },
    })

  if (leaving !== null) {
    return (
      <AuthShell eyebrow="Conectar aplicación" title={leaving ? 'Acceso autorizado' : 'Conexión cancelada'}>
        <p className="flex items-center gap-2 text-sm text-slate-300" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Volviendo a {request.redirect_host}…
        </p>
      </AuthShell>
    )
  }

  const failure = decide.error instanceof ApiError ? decide.error.message : decide.error ? 'No se pudo guardar tu decisión. Inténtalo de nuevo.' : null

  return (
    <AuthShell eyebrow="Conectar aplicación" title="Autoriza el acceso">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">La aplicación</p>
        <p className="mt-1 break-words font-display text-xl font-bold text-white">{request.client_name}</p>
        <p className="mt-1 text-sm text-slate-400">
          quiere conectarse a tu cuenta{profile ? <> de <span className="text-white">{profile.name || profile.email}</span></> : null}.
        </p>

        <h2 className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Podrá</h2>
        <ul className="mt-2 space-y-2">
          {request.scopes.map((s) => (
            <li key={s.scope} className="flex items-start gap-2 text-sm text-slate-200">
              <Check className="mt-0.5 size-4 shrink-0 text-zona-400" aria-hidden="true" />
              {s.description}
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-start gap-2 text-sm text-slate-400">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden="true" />
          No podrá crear, editar ni borrar nada, ni ver datos de otras ligas.
        </p>
      </div>

      <p className="mt-4 text-sm text-slate-400">
        Al autorizar volverás a <span className="font-medium text-white">{request.redirect_host}</span>. Conéctala solo si tú
        iniciaste esta conexión.
      </p>

      {failure && (
        <div className="mt-4">
          <Problem message={failure} />
        </div>
      )}

      <div className="mt-6 space-y-3">
        <Button type="button" className={authButtonClass} disabled={decide.isPending} onClick={() => submit(true)}>
          {decide.isPending && decide.variables ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Autorizar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={decide.isPending}
          onClick={() => submit(false)}
          className="h-12 w-full rounded-xl border-slate-700 bg-transparent text-slate-200 hover:bg-slate-900 hover:text-white md:h-12"
        >
          Cancelar
        </Button>
      </div>
      <p className="mt-4 text-xs text-slate-500">Puedes desconectarla cuando quieras desde «Aplicaciones conectadas» en tu panel.</p>
    </AuthShell>
  )
}
