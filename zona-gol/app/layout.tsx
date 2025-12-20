import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Orbitron } from 'next/font/google'
import { SupabaseProvider } from '@/lib/providers/supabase-provider'
import { Toaster } from 'sonner'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '700', '900'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#16a34a',
  colorScheme: 'dark light',
}

export const metadata: Metadata = {
  title: 'Zona Gol - Gestión de Ligas de Fútbol',
  description: 'Plataforma de gestión de ligas de fútbol amateur. Calendario, resultados, estadísticas y más.',
  generator: 'Zona-Gol',
  manifest: '/manifest.json',
  applicationName: 'Zona Gol',
  keywords: ['fútbol', 'liga', 'deportes', 'calendario', 'estadísticas', 'México'],
  authors: [{ name: 'Zona Gol' }],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Zona Gol',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/zona-gol-logo.png',
    shortcut: '/zona-gol-logo.png',
    apple: '/zona-gol-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        {/* iOS specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Zona Gol" />
        <link rel="apple-touch-icon" href="/zona-gol-logo.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/zona-gol-logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/zona-gol-logo.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/zona-gol-logo.png" />
        {/* iOS Splash Screens */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${orbitron.variable}`}>
        <SupabaseProvider>
          {children}
          <Toaster richColors position="top-right" />
          <InstallPrompt />
        </SupabaseProvider>
      </body>
    </html>
  )
}