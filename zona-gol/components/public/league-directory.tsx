"use client"

import Link from "next/link"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Trophy, Users, Calendar, ArrowRight, Loader2, LogIn, Info, RefreshCw } from "lucide-react"
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
    <div className="relative min-h-screen overflow-hidden">
      {/* Video de fondo */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src="/video/zona-gol.mp4" type="video/mp4" />
      </video>

      {/* Overlay oscuro para mejorar legibilidad */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-0"></div>

      {/* Contenido */}
      <div className="relative z-10">
        <header className="relative" style={{marginTop: '-1px'}}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl">
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-4">
                  <img src="/zona-gol.png" alt="Logo" className="w-44 h-44 md:w-48 md:h-48 drop-shadow-2xl" />
                  <h1 className="text-7xl md:text-8xl font-bold text-white mt-4 md:mt-0 drop-shadow-lg" style={{fontFamily: "var(--font-orbitron), sans-serif"}}>Zona-Gol</h1>
                </div>
                
                <div className="absolute top-6 right-6">
                  <Button asChild variant="outline" size="lg" className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white transition-all duration-300 shadow-lg">
                    <Link href="/login" className="flex items-center gap-2">
                      <LogIn size={18} />
                      <span>Acceso Administradores</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header con efecto glass */}
          <div className="mb-10 backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start">
              <div>
                <h2 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">Ligas Disponibles</h2>
                <p className="text-white/80 text-lg drop-shadow">Explora y únete a las competiciones activas</p>
              </div>
              <div className="mt-4 md:mt-0">
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20 transition-all duration-300"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Actualizando...' : 'Actualizar'}
                </Button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-12 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-xl">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
              <span className="ml-2 text-white drop-shadow">Cargando ligas...</span>
            </div>
          )}

          {error && (
            <div className="backdrop-blur-xl bg-red-500/20 border border-red-300/30 text-white p-4 rounded-2xl mb-6 shadow-xl">
              <p className="drop-shadow">Error al cargar las ligas: {error}</p>
            </div>
          )}

          {/* Grid de ligas con efecto glass */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeLeagues && activeLeagues.map((league) => {
              const stats = leagueStats[league.id] || { teamsCount: 0, tournamentsCount: 0, activeTournament: null };
              return (
                <div 
                  key={league.id} 
                  className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl hover:bg-white/20 hover:border-white/40 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 transform"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center gap-2">
                            <Avatar className="w-16 h-16 border-2 border-white/30 shadow-lg">
                              {league.logo && (
                                <AvatarImage
                                  src={league.logo}
                                  alt={`Logo de ${league.name}`}
                                />
                              )}
                              <AvatarFallback className="bg-white/20 backdrop-blur-md text-white font-medium text-xl">
                                {getLeagueInitials(league.name)}
                              </AvatarFallback>
                            </Avatar>
                            {loadingStats ? (
                              <Badge variant="outline" className="flex items-center gap-1 backdrop-blur-md bg-white/10 border-white/30 text-white">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="text-xs">Cargando</span>
                              </Badge>
                            ) : (
                              <Badge
                                variant={league.is_active ? "default" : "outline"}
                                className={league.is_active ? 'bg-green-500/80 backdrop-blur-md text-white border-0 shadow-lg' : 'backdrop-blur-md bg-white/10 border-white/30 text-white/70'}
                              >
                                <span className="text-xs">
                                  {league.is_active ? "Activo" : "Inactivo"}
                                </span>
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col items-center">
                            <h3 className="text-xl font-medium text-white drop-shadow-lg">{league.name}</h3>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Button 
                          asChild 
                          variant="outline"
                          size="sm"
                          className="backdrop-blur-md bg-green-500/20 text-white border-green-300/30 hover:bg-green-500/40 hover:border-green-300/50 transition-all duration-300 shadow-lg"
                        >
                          <Link href={`/liga/${league.slug}`} className="flex items-center">
                            Ver Liga
                            <ArrowRight className="w-3 h-3 ml-2" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {activeLeagues && activeLeagues.length === 0 && !loading && (
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 text-center max-w-md mx-auto shadow-xl">
              <Trophy className="w-12 h-12 text-white/70 mx-auto mb-4 drop-shadow-lg" />
              <h3 className="text-xl font-medium text-white mb-3 drop-shadow">No hay ligas disponibles</h3>
              <p className="text-white/80 mb-6 drop-shadow">Las ligas aparecerán aquí cuando estén disponibles públicamente</p>
              <Button 
                asChild 
                variant="outline"
                className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20 transition-all duration-300 shadow-lg"
              >
                <Link href="/login" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Acceder al Panel
                </Link>
              </Button>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
