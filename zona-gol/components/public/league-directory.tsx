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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 overflow-hidden">
      <header className="relative bg-cover bg-center bg-no-repeat shadow-md bg-[url('/zona-fondo.png')]" style={{marginTop: '-1px'}}>
  {/* Overlay semitransparente */}
  <div className="absolute inset-0 bg-black/60"></div>

  <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
    <div className="flex flex-col items-center justify-center text-center">
      <div>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-4">
          <img src="/zona-gol-final.webp" alt="Logo" className="w-44 h-44 md:w-48 md:h-48" />
          <h1 className="text-7xl md:text-8xl font-bold text-white mt-4 md:mt-0" style={{fontFamily: "var(--font-orbitron), sans-serif"}}>Zona-Gol</h1>
        </div>
        
        <div className="absolute top-6 right-6">
          <Button asChild variant="outline" size="lg" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
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

      <main className="max-w-auto mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Ligas Disponibles</h2>
            <p className="text-gray-500 text-lg">Explora y únete a las competiciones activas</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        </div>
        

        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            <span className="ml-2 text-gray-600">Cargando ligas...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
            <p>Error al cargar las ligas: {error}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activeLeagues && activeLeagues.map((league) => {
            const stats = leagueStats[league.id] || { teamsCount: 0, tournamentsCount: 0, activeTournament: null };
            return (
              <Card key={league.id} className="border border-gray-200 hover:border-green-500 transition-all duration-200 bg-white">
                <CardContent className="py-3 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-2">
                          <Avatar className="w-16 h-16">
                            {league.logo && (
                              <AvatarImage
                                src={league.logo}
                                alt={`Logo de ${league.name}`}
                              />
                            )}
                            <AvatarFallback className="bg-gray-100 text-gray-800 font-medium text-xl">
                              {getLeagueInitials(league.name)}
                            </AvatarFallback>
                          </Avatar>
                          {loadingStats ? (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span className="text-xs">Cargando</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant={league.is_active ? "default" : "outline"}
                              className={league.is_active ? 'bg-green-600' : 'text-gray-500'}
                            >
                              <span className="text-xs">
                                {league.is_active ? "Activo" : "Inactivo"}
                              </span>
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col items-center">
                          <h3 className="text-xl font-medium text-gray-900">{league.name}</h3>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Button 
                        asChild 
                        variant="outline"
                        size="sm"
                        className="text-green-700 border-green-200 hover:bg-green-50 hover:text-green-800"
                      >
                        <Link href={`/liga/${league.slug}`} className="flex items-center">
                          Ver Liga
                          <ArrowRight className="w-3 h-3 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {activeLeagues && activeLeagues.length === 0 && !loading && (
          <div className="bg-white border border-gray-200 rounded-md p-6 text-center max-w-md mx-auto">
            <Trophy className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay ligas disponibles</h3>
            <p className="text-gray-500 mb-4">Las ligas aparecerán aquí cuando estén disponibles públicamente</p>
            <Button 
              asChild 
              variant="outline"
              className="text-green-700 border-green-200 hover:bg-green-50"
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
  )
}
