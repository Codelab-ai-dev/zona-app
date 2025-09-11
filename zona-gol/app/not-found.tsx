import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Liga no encontrada</CardTitle>
          <CardDescription>La liga que buscas no existe o no está disponible públicamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Verifica que la URL sea correcta o contacta al administrador de la liga.
          </p>
          <div className="flex flex-col space-y-2">
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <Link href="/login">
                <Home className="w-4 h-4 mr-2" />
                Ir al Panel de Control
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Página Principal</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
