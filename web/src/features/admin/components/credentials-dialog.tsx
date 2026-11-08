import { useState } from 'react'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface CredentialsDialogProps {
  credentials: { email: string; password: string; leagueName: string } | null
  onClose: () => void
}

/** One-time credentials of the admin created together with a league. */
export function CredentialsDialog({ credentials, onClose }: CredentialsDialogProps) {
  const [showPassword, setShowPassword] = useState(false)

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(done)
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }

  return (
    <Dialog open={!!credentials} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <span className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-green-400" aria-hidden="true" />
            </span>
            Liga Creada
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm">
            Credenciales del administrador{credentials ? ` de ${credentials.leagueName}` : ''}:
          </DialogDescription>
        </DialogHeader>

        {credentials && (
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-800/50 border border-white/10 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Email</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Copiar email"
                  onClick={() => void copy(credentials.email, 'Email copiado')}
                  className="h-6 px-2 text-gray-400 hover:text-white"
                >
                  <Copy size={12} aria-hidden="true" />
                </Button>
              </div>
              <p className="text-white text-sm font-mono break-all">{credentials.email}</p>
            </div>

            <div className="rounded-lg bg-slate-800/50 border border-white/10 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Contraseña</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="h-6 px-2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={12} aria-hidden="true" /> : <Eye size={12} aria-hidden="true" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Copiar contraseña"
                    onClick={() => void copy(credentials.password, 'Contraseña copiada')}
                    className="h-6 px-2 text-gray-400 hover:text-white"
                  >
                    <Copy size={12} aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <p className="text-white text-sm font-mono break-all">{showPassword ? credentials.password : '••••••••••••'}</p>
            </div>

            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
              <p className="text-yellow-400 text-xs font-medium">Importante</p>
              <p className="text-gray-400 text-xs mt-1">Guarda estas credenciales. No se mostrarán nuevamente.</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="bg-green-500 hover:bg-green-600 text-white">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
