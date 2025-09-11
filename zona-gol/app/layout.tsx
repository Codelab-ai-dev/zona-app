import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Orbitron } from 'next/font/google'
import { SupabaseProvider } from '@/lib/providers/supabase-provider'
import { ThemeProvider } from '@/lib/contexts/theme-context'
import { ThemeScript } from '@/components/theme-script'
import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '700', '900'],
})  

export const metadata: Metadata = {
  title: 'Zona-Gol - Sistema de Gestión de Ligas de Fútbol',
  description: 'Gestiona tu liga de fútbol con Liga Manager',
  generator: 'Zona-Gol',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${orbitron.variable}`}>
        <ThemeProvider>
          <SupabaseProvider>
            {children}
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}