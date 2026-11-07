import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function VerificationPage() {
  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Verificación de Jugadores</h1>
        <p className="text-muted-foreground mt-1">Gestiona la verificación de identidad de jugadores</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          La verificación de documentos de identidad requiere endpoints adicionales en el backend que aún no existen:
          <ul className="list-disc list-inside mt-2 text-sm space-y-1">
            <li>GET /teams/{'{teamID}'}/players - con campos de verificación (id_verified, id_document_url, extracted_name, extracted_curp)</li>
            <li>PATCH /players/{'{playerID}'} - para actualizar campos de verificación</li>
            <li>Lógica de validación de edad contra límites del torneo</li>
          </ul>
          Por ahora, puedes actualizar información básica del jugador usando el endpoint PATCH /players/{'{playerID}'} disponible.
        </AlertDescription>
      </Alert>
    </div>
  )
}
