"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowRight,
  Calendar,
  Info,
  Loader2,
  LogIn,
  RefreshCw,
  Trophy,
  Users
} from "lucide-react"

import { useLeagues } from "@/lib/hooks/use-leagues"

interface LeagueStats {
  teamsCount: number;
  tournamentsCount: number;
  activeTournament: any | null;
}

interface League {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string | null;
  is_active: boolean;
  created_at: string;
}

export function LeagueDirectory() {
  const { getActiveLeagues, getLeagueStats, loading, error, leagues } = useLeagues();
  const [leagueStats, setLeagueStats] = useState<Record<string, LeagueStats>>({});
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Always filter to show only active leagues, regardless of what's in the store
  const activeLeagues = useMemo(() => {
    return leagues?.filter(league => league.is_active) || [];
  }, [leagues]);

  // Función para refrescar manualmente
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await getActiveLeagues();
    } catch (error) {
      console.error('Error refreshing leagues:', error);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    // Cargar ligas al montar el componente
    getActiveLeagues().catch(console.error);

    // Escuchar eventos de actualización de ligas
    const handleLeagueUpdate = () => {
      getActiveLeagues().catch(console.error);
    };

    window.addEventListener('league-status-updated', handleLeagueUpdate);

    return () => {
      window.removeEventListener('league-status-updated', handleLeagueUpdate);
    };
  }, []); // Sin dependencias para evitar re-ejecuciones

  useEffect(() => {
    // Recargar estadísticas cuando cambien las ligas
    const loadStats = async () => {
      if (!leagues || leagues.length === 0) {
        setLeagueStats({});
        return;
      }

      const currentActiveLeagues = leagues.filter(league => league.is_active);

      if (currentActiveLeagues.length === 0) {
        setLeagueStats({});
        return;
      }

      setLoadingStats(true);
      const stats: Record<string, LeagueStats> = {};

      try {
        for (const league of currentActiveLeagues) {
          const leagueStat = await getLeagueStats(league.id);
          stats[league.id] = leagueStat;
        }

        setLeagueStats(stats);
      } catch (error) {
        console.error('Error loading league stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    // Solo cargar stats si realmente hay cambios en leagues
    loadStats();
  }, [leagues]); // Solo dependemos de leagues

  const getLeagueInitials = (leagueName: string) => {
    return leagueName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(51,214,159,0.22),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(56,189,248,0.18),_transparent_45%)]" />
      <div className="absolute inset-x-0 top-0 h-64 bg-[url('/zona-fondo.png')] bg-cover bg-center opacity-20" />

      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-20 pt-16 sm:px-6 lg:px-8">
          <div className="absolute right-4 top-6 z-10 flex flex-col items-end gap-3 sm:right-8">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="backdrop-blur bg-white/10 text-white hover:bg-white/20"
            >
              <Link href="/login" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
                <LogIn className="h-3.5 w-3.5" />
                Acceso Administradores
              </Link>
            </Button>
            <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-white/80 backdrop-blur">
              Gestión profesional de ligas
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center gap-8 text-center">
            <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/5 px-8 py-10 shadow-[0_0_120px_rgba(21,128,61,0.35)] backdrop-blur-xl sm:px-12">
              <div className="absolute -top-20 right-12 h-40 w-40 rounded-full bg-emerald-500/30 blur-3xl" />
              <div className="absolute -bottom-24 left-8 h-52 w-52 rounded-full bg-sky-500/30 blur-3xl" />
              <div className="relative flex flex-col items-center gap-6">
                <img
                  src="/zona-gol-final.webp"
                  alt="Zona Gol"
                  className="h-32 w-32 sm:h-36 sm:w-36 drop-shadow-[0_18px_45px_rgba(56,189,248,0.35)]"
                />
                <div className="flex flex-col items-center gap-3">
                  <span className="rounded-full bg-emerald-500/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-100">
                    Plataforma 2024
                  </span>
                  <h1
                    className="text-4xl font-black uppercase text-white sm:text-5xl md:text-6xl"
                    style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
                  >
                    Zona-Gol
                  </h1>
                  <p className="max-w-3xl text-balance text-sm text-white/70 sm:text-base">
                    Centraliza tus ligas, administra torneos y ofrece experiencias inmersivas a administradores, clubes y aficionados con una estética futurista inspirada en dashboards deportivos.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid w-full gap-4 sm:grid-cols-3">
              {[{ label: "Ligas activas", value: activeLeagues.length, accent: "from-emerald-500/80 to-emerald-400/50" }, { label: "Calendarios dinámicos", value: "Tiempo real", accent: "from-sky-500/80 to-sky-400/50" }, { label: "Modo oscuro", value: "Optimizado", accent: "from-fuchsia-500/80 to-purple-500/50" }].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-3xl border border-white/10 bg-gradient-to-br ${item.accent} px-4 py-5 text-left text-white shadow-lg shadow-black/20 backdrop-blur`}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{item.label}</p>
                  <p className="mt-1 text-2xl font-black">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm uppercase tracking-widest text-emerald-300/80">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300"></span>
              Descubre ligas oficiales
            </div>
            <h2 className="text-3xl font-black text-white sm:text-4xl">Panel de ligas disponibles</h2>
            <p className="max-w-2xl text-sm text-white/70 sm:text-base">
              Explora organizaciones activas, consulta estadísticas clave y accede a vistas detalladas sin abandonar la página.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white/80 backdrop-blur transition hover:bg-white/10"
                >
                  <Info className="mr-2 h-4 w-4" />
                  ¿Cómo se actualiza?
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 rounded-2xl border border-slate-200/20 bg-slate-900/95 text-white backdrop-blur">
                <p className="text-sm text-white/80">
                  El directorio se sincroniza automáticamente con Supabase. También puedes forzar la actualización con el botón "Refrescar" para ver nuevas ligas en segundos.
                </p>
              </PopoverContent>
            </Popover>
            <Button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              size="sm"
              className="h-10 rounded-full bg-gradient-to-r from-emerald-400 to-sky-500 px-5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Actualizando" : "Refrescar"}
            </Button>
          </div>
        </div>

        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-2xl bg-white/10" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-4 w-3/4 bg-white/10" />
                    <Skeleton className="h-3 w-1/2 bg-white/10" />
                    <Skeleton className="h-3 w-2/5 bg-white/10" />
                  </div>
                </div>
                <Skeleton className="mt-6 h-10 w-full rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-red-200 backdrop-blur">
            Error al cargar las ligas: {error}
          </div>
        )}

        {!loading && activeLeagues.length > 0 && (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {activeLeagues.map((league) => {
              const stats = leagueStats[league.id] || { teamsCount: 0, tournamentsCount: 0, activeTournament: null }

              return (
                <Card
                  key={league.id}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/8 p-0 shadow-[0_18px_45px_rgba(15,118,110,0.25)] transition duration-300 hover:border-emerald-400/50 hover:shadow-[0_24px_65px_rgba(59,130,246,0.35)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-sky-500/10 opacity-0 transition group-hover:opacity-100" />
                  <CardContent className="relative flex h-full flex-col gap-6 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="absolute -inset-1 rounded-2xl bg-emerald-400/30 blur" />
                          <Avatar className="relative h-16 w-16 rounded-2xl border border-white/10 bg-white/20">
                            {league.logo ? (
                              <AvatarImage src={league.logo} alt={`Logo de ${league.name}`} />
                            ) : (
                              <AvatarFallback className="text-lg font-semibold text-slate-900">
                                {getLeagueInitials(league.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge className="rounded-full border border-white/10 bg-white/10 px-3 text-xs font-semibold text-white/80">
                              {new Date(league.created_at).getFullYear()}
                            </Badge>
                            {loadingStats ? (
                              <Badge className="flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 text-xs font-semibold text-white/70">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Sincronizando
                              </Badge>
                            ) : (
                              <Badge variant={league.is_active ? "default" : "outline"} className="rounded-full bg-emerald-400/20 text-xs font-semibold uppercase tracking-wider text-emerald-100">
                                {league.is_active ? "Activa" : "Próximamente"}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-2xl font-black text-white">{league.name}</h3>
                          <p className="line-clamp-2 text-sm text-white/60">{league.description}</p>
                        </div>
                      </div>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-white/10 bg-white/10 text-white transition hover:bg-white/20">
                            <Info className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 rounded-3xl border border-slate-200/10 bg-slate-900/95 p-4 text-white backdrop-blur">
                          <div className="space-y-2 text-sm text-white/70">
                            <p className="font-semibold text-white">{league.name}</p>
                            <p>Último torneo activo: {stats.activeTournament?.name ?? "Sin torneo"}</p>
                            <p>Equipos registrados: {stats.teamsCount}</p>
                            <p>Torneos creados: {stats.tournamentsCount}</p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="mt-auto space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                          <Trophy className="mx-auto mb-2 h-5 w-5 text-amber-300" />
                          <p className="text-xs text-white/60">Torneos</p>
                          <p className="text-lg font-semibold text-white">{stats.tournamentsCount}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                          <Users className="mx-auto mb-2 h-5 w-5 text-sky-300" />
                          <p className="text-xs text-white/60">Equipos</p>
                          <p className="text-lg font-semibold text-white">{stats.teamsCount}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                          <Calendar className="mx-auto mb-2 h-5 w-5 text-emerald-300" />
                          <p className="text-xs text-white/60">Calendario</p>
                          <p className="text-lg font-semibold text-white">{stats.activeTournament ? "Activo" : "Pendiente"}</p>
                        </div>
                      </div>

                      <Button
                        asChild
                        className="group/button inline-flex w-full items-center justify-between rounded-full bg-gradient-to-r from-emerald-400 to-sky-500 px-6 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
                      >
                        <Link href={`/liga/${league.slug}`}>
                          Ver detalles
                          <ArrowRight className="ml-2 h-4 w-4 transition group-hover/button:translate-x-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {!loading && activeLeagues.length === 0 && (
          <div className="mx-auto max-w-2xl rounded-[32px] border border-white/10 bg-white/5 p-12 text-center text-white shadow-[0_18px_45px_rgba(15,118,110,0.35)] backdrop-blur">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10">
              <Trophy className="h-8 w-8 text-emerald-200" />
            </div>
            <h3 className="text-2xl font-bold">Aún no hay ligas públicas</h3>
            <p className="mt-3 text-sm text-white/70">
              Estamos preparando nuevas competencias. Activa las notificaciones o accede al panel para gestionar tus propias ligas.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                className="rounded-full bg-gradient-to-r from-emerald-400 to-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
              >
                <Link href="/login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Acceder al panel
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="rounded-full border border-white/10 bg-white/10 px-6 py-3 text-sm text-white/80 backdrop-blur transition hover:bg-white/20"
              >
                Recibir novedades
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
