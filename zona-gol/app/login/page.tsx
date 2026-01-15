import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

function LoginFormFallback() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center">
      <div className="animate-pulse">
        <div className="w-36 h-36 rounded-full bg-emerald-500/20" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  )
}
