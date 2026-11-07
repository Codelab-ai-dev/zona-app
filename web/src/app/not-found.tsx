import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="text-muted-foreground">La dirección no existe o ya no está disponible.</p>
      <Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">
        Volver al inicio
      </Link>
    </main>
  )
}
