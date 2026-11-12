import { CheckCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface OwnerCredentials {
  name: string
  email: string
  password: string
}

interface Props {
  credentials: OwnerCredentials | null
  onClose: () => void
}

/** Shown once after creating a team: the generated password cannot be recovered later. */
export function OwnerCredentialsDialog({ credentials, onClose }: Props) {
  return (
    <Dialog open={credentials !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] border-green-500/30 bg-slate-900 md:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-sm text-green-400 md:text-base">
            <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Equipo Creado Exitosamente
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400 md:text-sm">Guarda estas credenciales de acceso.</DialogDescription>
        </DialogHeader>
        {credentials && (
          <div className="space-y-3 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
            <h4 className="text-xs font-medium text-green-400 md:text-sm">Credenciales del Propietario</h4>
            <dl className="space-y-2 text-xs md:text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-gray-400">Nombre:</dt>
                <dd className="font-medium text-white">{credentials.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-gray-400">Email:</dt>
                <dd className="rounded bg-slate-800/50 px-2 py-1 font-mono text-xs text-white break-all">{credentials.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-gray-400">Contraseña:</dt>
                <dd className="rounded bg-slate-800/50 px-2 py-1 font-mono text-xs text-white">{credentials.password}</dd>
              </div>
            </dl>
            <div className="rounded border border-blue-500/20 bg-blue-500/10 p-2">
              <p className="text-[10px] text-blue-400 md:text-xs">
                <strong>Importante:</strong> Comparte estas credenciales de forma segura.
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose} className="h-9 w-full bg-green-500 text-sm text-white hover:bg-green-600">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
