import { Trophy, Users, Calendar, ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Decorative background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/[0.08] rounded-full blur-[100px] motion-reduce:opacity-0"
          aria-hidden="true"
          style={{ animation: 'none' }}
        />
        <div
          className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-cyan-500/[0.06] rounded-full blur-[80px] motion-reduce:opacity-0"
          aria-hidden="true"
          style={{ animation: 'none' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/[0.07] rounded-full blur-[80px] motion-reduce:opacity-0"
          aria-hidden="true"
          style={{ animation: 'none' }}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/zona-gol.png" alt="" width={32} height={32} className="h-8 w-8" />
                <span className="text-xl font-bold text-white">Zona Gol</span>
              </div>
              <nav className="hidden items-center gap-8 md:flex">
                <a href="#features" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">
                  Características
                </a>
                <a href="#ligas" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">
                  Ligas
                </a>
                <Button asChild variant="outline" size="sm">
                  <Link to="/login">Iniciar Sesión</Link>
                </Button>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="flex-1 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto w-full max-w-4xl text-center">
            <div className="mb-6 flex justify-center">
              <img src="/zona-gol.png" alt="" width={80} height={80} className="h-20 w-20" />
            </div>
            <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">
              Gestiona tu Liga de
              <span className="block text-emerald-400">Fútbol Fácilmente</span>
            </h1>
            <p className="mt-6 text-base text-slate-400 sm:text-lg">
              La plataforma completa para administrar ligas, equipos, jugadores y torneos.
              Controla estadísticas, resultados y mantén a todos informados en tiempo real.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Link to="/login">
                  Comenzar Ahora
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#ligas">
                  Ver Ligas Públicas
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-t border-white/10 bg-slate-800/50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-12 text-center sm:mb-16">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Todo lo que necesitas para tu liga
              </h2>
              <p className="mt-4 text-base text-slate-400 sm:text-lg">
                Herramientas profesionales diseñadas específicamente para la gestión deportiva
              </p>
            </div>

            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Users, title: 'Gestión de Equipos', description: 'Administra equipos y jugadores de forma sencilla' },
                { icon: Trophy, title: 'Torneos y Partidos', description: 'Organiza torneos y programa partidos automáticamente' },
                { icon: Calendar, title: 'Programación', description: 'Calendario inteligente para partidos y eventos' },
              ].map(({ icon: Icon, title, description }, idx) => (
                <li key={idx}>
                  <Card className="h-full border-slate-700 bg-slate-800/50 transition-colors hover:border-emerald-500/50">
                    <CardHeader>
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20">
                        <Icon className="h-6 w-6 text-emerald-400" aria-hidden="true" />
                      </div>
                      <CardTitle className="text-white">{title}</CardTitle>
                      <CardDescription className="text-slate-400">{description}</CardDescription>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-white/10 bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto w-full max-w-4xl text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              ¿Listo para digitalizar tu liga?
            </h2>
            <p className="mt-4 text-base text-slate-400">
              Únete a cientos de ligas que ya están usando Zona Gol
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Link to="/login">Comenzar Gratis</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#ligas">Ver Demo</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Ligas Section */}
        <section id="ligas" className="border-t border-white/10 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto w-full max-w-4xl text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Ligas Disponibles</h2>
            <p className="mt-2 text-sm text-slate-400">Explora las competiciones activas</p>
            <Button asChild size="lg" className="mt-6 bg-emerald-600 hover:bg-emerald-700">
              <Link to="/ligas">Ver Todas las Ligas</Link>
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-slate-900/50 px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Zona Gol. Sistema de gestión de ligas deportivas.
          </div>
        </footer>
      </div>
    </div>
  )
}
