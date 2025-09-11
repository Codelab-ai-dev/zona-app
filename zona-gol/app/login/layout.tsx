export const metadata = {
  title: 'Login - Zona-Gol',
  description: 'Iniciar sesión en Zona-Gol',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="login-layout">
      {children}
    </div>
  )
}
