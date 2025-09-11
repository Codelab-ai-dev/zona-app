import { DebugLogin } from "@/components/auth/debug-login"

export default function DebugLoginPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Depuración de Autenticación</h1>
      <DebugLogin />
    </div>
  )
}
