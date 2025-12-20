"use client"

import { WifiOff, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload()
  }

  const handleHome = () => {
    window.location.href = "/"
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Sin conexión</CardTitle>
          <CardDescription>
            Parece que no tienes conexión a internet. Verifica tu conexión e intenta de nuevo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Algunas funciones pueden estar disponibles offline:</p>
            <ul className="mt-2 space-y-1">
              <li>• Ver calendario guardado</li>
              <li>• Ver tabla de posiciones</li>
              <li>• Consultar estadísticas</li>
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar conexión
            </Button>
            <Button variant="outline" onClick={handleHome} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Ir al inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
