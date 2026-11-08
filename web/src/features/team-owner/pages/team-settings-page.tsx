import { CheckCircle, Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChangePasswordDialog } from '@/features/auth/change-password-dialog'

const tips = [
  'Usa una contraseña única que no uses en otros sitios',
  'Cambia tu contraseña periódicamente',
  'No compartas tu contraseña con nadie',
  'Usa un administrador de contraseñas si es posible',
]

/** Configuración tab: the password change lives in the shared dialog of the auth feature. */
export function TeamSettingsPage() {
  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <Lock className="w-5 h-5 text-yellow-300" aria-hidden="true" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription className="text-white/80 drop-shadow">
            Actualiza tu contraseña para mantener tu cuenta segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordDialog
            trigger={
              <Button className="w-full backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg">
                <Lock className="w-4 h-4 mr-2" aria-hidden="true" />
                Cambiar Contraseña
              </Button>
            }
          />
        </CardContent>
      </Card>

      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white drop-shadow-lg">Consejos de Seguridad</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-white/80 drop-shadow">
            {tips.map((tip) => (
              <li key={tip} className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-300 mr-2" aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
