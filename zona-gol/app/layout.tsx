import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Orbitron } from 'next/font/google'
import { SupabaseProvider } from '@/lib/providers/supabase-provider'
import { Toaster } from 'sonner'
import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '700', '900'],
})

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#27AE60',
}

export const metadata: Metadata = {
  title: 'Zona-Gol - Sistema de Gestión de Ligas de Fútbol',
  description: 'Gestiona tu liga de fútbol con Liga Manager',
  generator: 'Zona-Gol',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zona-Gol',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${orbitron.variable}`}>
        <SupabaseProvider>
          {children}
          <Toaster richColors position="top-right" />
        </SupabaseProvider>
      </body>
    </html>
  )
}