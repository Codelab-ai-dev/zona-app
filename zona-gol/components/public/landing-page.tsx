"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Trophy, 
  Users, 
  BarChart3, 
  Shield, 
  Calendar,
  Target,
  ArrowRight,
  CheckCircle,
  Play
} from "lucide-react"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-soccer-white via-blue-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-soccer-green rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-soccer-blue">Zona Gol</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-soccer-gray hover:text-soccer-green transition-colors">
                Características
              </Link>
              <Link href="#how-it-works" className="text-soccer-gray hover:text-soccer-green transition-colors">
                Cómo Funciona
              </Link>
              <Link href="#ligas" className="text-soccer-gray hover:text-soccer-green transition-colors">
                Ligas
              </Link>
              <Button asChild variant="outline">
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            Sistema Completo de Gestión
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Gestiona tu Liga de
            <span className="text-soccer-green block">Fútbol Fácilmente</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            La plataforma completa para administrar ligas, equipos, jugadores y torneos. 
            Controla estadísticas, resultados y mantén a todos informados en tiempo real.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-soccer-green hover:bg-soccer-green-dark" asChild>
              <Link href="/login">
                <Play className="w-5 h-5 mr-2" />
                Comenzar Ahora
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#ligas">
                Ver Ligas Públicas
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para tu liga
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Herramientas profesionales diseñadas específicamente para la gestión deportiva
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-soccer-green/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-soccer-green" />
                </div>
                <CardTitle>Gestión de Equipos</CardTitle>
                <CardDescription>
                  Administra equipos, jugadores y roles de forma sencilla
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Registro de jugadores
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Asignación de posiciones
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Control de dorsales
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-soccer-blue/10 rounded-lg flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6 text-soccer-blue" />
                </div>
                <CardTitle>Torneos y Partidos</CardTitle>
                <CardDescription>
                  Organiza torneos y programa partidos automáticamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Calendarios automáticos
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Gestión de resultados
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Tablas de posiciones
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-soccer-gold/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-soccer-gold-dark" />
                </div>
                <CardTitle>Estadísticas Avanzadas</CardTitle>
                <CardDescription>
                  Registra y analiza el rendimiento de jugadores y equipos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Goles y asistencias
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Tarjetas y minutos
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Reportes detallados
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-soccer-red/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-soccer-red" />
                </div>
                <CardTitle>Control de Acceso</CardTitle>
                <CardDescription>
                  Sistema de roles para diferentes tipos de usuarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Super administradores
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Administradores de liga
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Dueños de equipo
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-soccer-blue/10 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-soccer-blue" />
                </div>
                <CardTitle>Programación</CardTitle>
                <CardDescription>
                  Calendario inteligente para partidos y eventos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Fechas automáticas
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Notificaciones
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Sincronización
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-soccer-green/10 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-soccer-green" />
                </div>
                <CardTitle>Vista Pública</CardTitle>
                <CardDescription>
                  Información accesible para aficionados y familias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Resultados en vivo
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Clasificaciones
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-soccer-green mr-2" />
                    Próximos partidos
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Cómo funciona
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tres simples pasos para tener tu liga funcionando
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-soccer-green rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4">Crea tu Liga</h3>
              <p className="text-gray-600">
                Registra tu liga con información básica y comienza a configurar la estructura
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-soccer-blue rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4">Agrega Equipos</h3>
              <p className="text-gray-600">
                Invita a los dueños de equipos para que registren sus jugadores y gestionen sus plantillas
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-soccer-gold-dark rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4">Programa Torneos</h3>
              <p className="text-gray-600">
                Crea torneos, programa partidos y comienza a registrar resultados automáticamente
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-soccer-green to-soccer-blue">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            ¿Listo para digitalizar tu liga?
          </h2>
          <p className="text-xl text-soccer-white mb-8">
            Únete a cientos de ligas que ya están usando Zona Gol para mejorar su organización
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-soccer-green hover:bg-gray-100">
              <Link href="/login">
                Comenzar Gratis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-soccer-green" asChild>
              <a href="#ligas">Ver Demo</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Ligas Section */}
      <section id="ligas" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Ligas Disponibles
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Explora las ligas públicamente disponibles
            </p>
          </div>
          <div className="text-center py-8">
            <Button size="lg" asChild className="bg-soccer-green hover:bg-soccer-green-dark">
              <Link href="/ligas">Ver Todas las Ligas</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-soccer-green rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Zona Gol</span>
            </div>
            <p className="text-gray-400">
              © 2024 Zona Gol. Sistema de gestión de ligas deportivas.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}