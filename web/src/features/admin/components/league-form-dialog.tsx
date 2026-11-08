import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiError } from '@/lib/api/client'
import {
  CreateLeagueFlowError,
  useLeagueAdminCandidates,
  useCreateLeague,
  useUpdateLeague,
  type LeagueAdminChoice,
} from '../api'
import type { League, ProductMode } from '../types'
import { emptyAdminDraft, LeagueAdminFields, type AdminDraft } from './league-admin-fields'
import { LeagueAdminEditor } from './league-admin-editor'
import { LeagueBasicFields, type LeagueDraft } from './league-basic-fields'
import { LeagueProductModeEditor } from './league-product-mode-editor'
import { PRODUCT_MODE_CONFIG } from './product-mode-config'
import { ProductModeSelector } from './product-mode-selector'

export interface CreatedLeagueInfo {
  leagueName: string
  /** Present only when a new admin was created. */
  credentials?: { email: string; password: string }
}

interface LeagueFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  league?: League | null
  onCreated?: (info: CreatedLeagueInfo) => void
}

const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

const prefixed = (fields: Record<string, string>) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [`admin_${k}`, v]))

/** Client-side checks of the admin section (the API repeats them). */
function validateAdmin(draft: AdminDraft): Record<string, string> {
  if (draft.mode === 'existing') return draft.existingId ? {} : { admin_existingId: 'El administrador es requerido' }
  const errs: Record<string, string> = {}
  if (draft.name.trim().length < 2) errs.admin_name = 'El nombre es requerido'
  if (!draft.email.trim()) errs.admin_email = 'El email es requerido'
  if (draft.password.length < 10) errs.admin_password = 'La contraseña debe tener al menos 10 caracteres'
  else if (draft.password !== draft.confirmPassword) errs.admin_confirmPassword = 'Las contraseñas no coinciden'
  return errs
}

/**
 * Create (league + its admin) or edit (data, admin and product mode) a league.
 * Mount with a `key` that changes per league so the form state follows it.
 */
export function LeagueFormDialog({ open, onOpenChange, league, onCreated }: LeagueFormDialogProps) {
  const isEditing = !!league
  const [data, setData] = useState<LeagueDraft>({
    name: league?.name ?? '',
    slug: league?.slug ?? '',
    description: league?.description ?? '',
  })
  const [productMode, setProductMode] = useState<ProductMode>('full')
  const [admin, setAdmin] = useState<AdminDraft>(emptyAdminDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  // What a failed attempt already created; the retry reuses it instead of duplicating.
  const [notice, setNotice] = useState<string | null>(null)
  const [adminCreated, setAdminCreated] = useState(false)

  const users = useLeagueAdminCandidates()
  const admins = (users.data?.data ?? []).filter((u) => u.role === 'league_admin' && u.is_active)

  const createLeague = useCreateLeague()
  const updateLeague = useUpdateLeague()
  const isPending = createLeague.isPending || updateLeague.isPending

  const handleOpenChange = (next: boolean) => {
    if (!next) setErrors({})
    onOpenChange(next)
  }

  const handleNameChange = (name: string) => {
    // The slug follows the name only when creating: renaming must not break public URLs
    setData((prev) => ({ ...prev, name, slug: isEditing ? prev.slug : generateSlug(name) }))
  }

  const handleUpdate = async () => {
    if (!league) return
    try {
      await updateLeague.mutateAsync({ id: league.id, data: { name: data.name, slug: data.slug, description: data.description, logo: league.logo } })
      toast.success('Liga actualizada exitosamente')
      handleOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.isValidation && Object.keys(err.fields).length > 0) setErrors(err.fields)
      else if (err instanceof ApiError && err.status === 409) setErrors({ slug: 'Esta URL ya está en uso' })
      else toast.error(err instanceof ApiError ? err.message : 'Error al guardar la liga')
    }
  }

  const handleCreate = async () => {
    const adminErrors = validateAdmin(admin)
    if (!adminCreated && Object.keys(adminErrors).length > 0) {
      setErrors(adminErrors)
      return
    }
    setErrors({})
    const choice: LeagueAdminChoice =
      admin.mode === 'existing'
        ? { kind: 'existing', id: admin.existingId }
        : {
            kind: 'new',
            data: {
              name: admin.name,
              email: admin.email,
              password: admin.password,
              phone: admin.phone || undefined,
              role: 'league_admin',
            },
          }
    try {
      const result = await createLeague.mutateAsync({
        league: { name: data.name, slug: data.slug, description: data.description },
        product_mode: productMode,
        features: PRODUCT_MODE_CONFIG[productMode].features,
        admin: choice,
      })
      toast.success('Liga creada exitosamente')
      onCreated?.({ leagueName: result.league.name, credentials: result.credentials })
      handleOpenChange(false)
    } catch (err) {
      if (!(err instanceof CreateLeagueFlowError)) {
        toast.error('Error al crear la liga')
        return
      }
      const cause = err.cause
      const fields = cause instanceof ApiError && cause.isValidation ? cause.fields : {}
      if (err.created.adminEmail) setAdminCreated(true)
      if (err.step === 'admin') {
        setErrors(cause instanceof ApiError && cause.status === 409 ? { admin_email: 'Este correo ya está registrado' } : prefixed(fields))
      } else if (err.step === 'league') {
        setErrors(cause instanceof ApiError && cause.status === 409 ? { slug: 'Esta URL ya está en uso' } : fields)
      }
      if (err.created.adminEmail && err.step === 'league') {
        setNotice(`El administrador ${err.created.adminEmail} ya se creó, pero la liga no. Corrige los datos y vuelve a intentar: se usará ese mismo administrador.`)
      } else if (err.step === 'link' || err.step === 'mode') {
        setNotice(`La liga "${err.created.leagueName}" ya se creó, pero no se pudo terminar la configuración. Vuelve a intentar para completarla sin duplicar nada.`)
      }
      const hasFieldErrors = Object.keys(fields).length > 0 || (cause instanceof ApiError && cause.status === 409 && err.step !== 'link' && err.step !== 'mode')
      if (!hasFieldErrors) toast.error(cause instanceof ApiError ? cause.message : 'Error al crear la liga')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white text-base md:text-lg">{isEditing ? 'Editar Liga' : 'Crear Nueva Liga'}</DialogTitle>
          <DialogDescription className="text-gray-500 text-xs md:text-sm">
            {isEditing ? 'Modifica la información de la liga' : 'Completa los datos de la liga y de su administrador'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {notice && (
            <div role="alert" className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-300">
              {notice}
            </div>
          )}

          <LeagueBasicFields value={data} errors={errors} onNameChange={handleNameChange} onChange={(patch) => setData((prev) => ({ ...prev, ...patch }))} />

          {league ? (
            <>
              <LeagueAdminEditor admins={admins} league={league} />
              <LeagueProductModeEditor league={league} />
            </>
          ) : (
            <>
              <ProductModeSelector value={productMode} onChange={setProductMode} disabled={isPending} />
              <LeagueAdminFields value={admin} onChange={setAdmin} admins={admins} errors={errors} locked={adminCreated} />
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className="bg-slate-700/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button className="bg-green-500 hover:bg-green-600 text-white border-0" onClick={() => void (isEditing ? handleUpdate() : handleCreate())} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isPending ? 'Guardando…' : isEditing ? 'Actualizar Liga' : admin.mode === 'new' ? 'Crear Liga y Administrador' : 'Crear Liga'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
