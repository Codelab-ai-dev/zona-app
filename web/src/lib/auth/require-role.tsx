import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { LoadingState } from '@/components/states'
import { useAuth, type Role } from '@/lib/auth/auth-context'

/**
 * Route guard for the UI only. It avoids showing screens the user can't use;
 * real authorization is enforced by the Go API on every request.
 */
export function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { status, profile } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <LoadingState label="Verificando sesión…" />
  if (status === 'anonymous' || !profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />
  return <>{children}</>
}
