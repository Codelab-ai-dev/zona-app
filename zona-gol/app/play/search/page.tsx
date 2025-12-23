"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Play,
  Eye,
  Calendar,
  Video,
  Users,
  Trophy,
  X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Datos de ejemplo para búsqueda
const searchData = {
  matches: [
    {
      id: "m1",
      title: "Liga Premier - Final",
      homeTeam: "Tigres FC",
      awayTeam: "Leones United",
      score: "3 - 2",
      duration: "1:45:30",
      views: 1250,
      date: "2024-12-20",
      league: "Liga Premier",
    },
    {
      id: "m2",
      title: "Copa Local - Semifinal",
      homeTeam: "Tigres FC",
      awayTeam: "Águilas FC",
      score: "4 - 2",
      duration: "1:38:15",
      views: 890,
      date: "2024-12-15",
      league: "Copa Local",
    },
  ],
  clips: [
    {
      id: "c1",
      title: "Golazo de media cancha",
      player: "Carlos Hernández",
      team: "Tigres FC",
      duration: "0:45",
      views: 34200,
      type: "goal",
    },
    {
      id: "c2",
      title: "Hat-trick de Carlos",
      player: "Carlos Hernández",
      team: "Tigres FC",
      duration: "1:20",
      views: 8900,
      type: "goal",
    },
  ],
  teams: [
    {
      id: "t1",
      name: "Tigres FC",
      league: "Liga Premier",
      followers: 1250,
      position: 1,
    },
    {
      id: "t2",
      name: "Tigres Juvenil",
      league: "Liga Sub-20",
      followers: 340,
      position: 3,
    },
  ],
  leagues: [
    {
      id: "l1",
      name: "Liga Premier",
      teams: 12,
      videos: 156,
    },
  ],
};

const popularSearches = [
  "Tigres FC",
  "Final Liga Premier",
  "Mejores goles",
  "Atajadas",
  "Leones United",
  "Carlos Hernández",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setHasSearched(true);
    }
  };

  const handlePopularSearch = (term: string) => {
    setQuery(term);
    setHasSearched(true);
  };

  const clearSearch = () => {
    setQuery("");
    setHasSearched(false);
  };

  return (
    <div className="container max-w-screen-xl py-6 space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Buscar</h1>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar partidos, clips, equipos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 pr-12 py-6 text-lg bg-muted border-0 focus-visible:ring-primary"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>

      {/* Popular Searches (when no search) */}
      {!hasSearched && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Búsquedas populares</h2>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((term) => (
              <Button
                key={term}
                variant="outline"
                size="sm"
                onClick={() => handlePopularSearch(term)}
                className="rounded-full"
              >
                {term}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="matches" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Partidos
            </TabsTrigger>
            <TabsTrigger value="clips" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Clips
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Equipos
            </TabsTrigger>
            <TabsTrigger value="leagues" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Ligas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {/* Matches */}
            {searchData.matches.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Partidos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchData.matches.map((match) => (
                    <Link key={match.id} href={`/play/watch/${match.id}`}>
                      <Card className="group hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4 flex gap-4">
                          <div className="w-32 aspect-video bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <Play className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Badge variant="outline" className="text-xs mb-1">
                              {match.league}
                            </Badge>
                            <div className="font-medium line-clamp-1">
                              {match.homeTeam} vs {match.awayTeam}
                            </div>
                            <div className="text-lg font-bold text-primary">{match.score}</div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {match.views}
                              </span>
                              <span>{match.duration}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Clips */}
            {searchData.clips.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Clips</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {searchData.clips.map((clip) => (
                    <Link key={clip.id} href={`/play/watch/${clip.id}`}>
                      <Card className="group overflow-hidden hover:bg-muted/50 transition-colors">
                        <CardContent className="p-0">
                          <div className="relative aspect-[9/16] bg-muted max-h-[180px]">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Play className="w-4 h-4 text-accent fill-current ml-0.5" />
                              </div>
                            </div>
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-xs text-white">
                              {clip.duration}
                            </div>
                          </div>
                          <div className="p-2">
                            <div className="font-medium text-xs line-clamp-2">{clip.title}</div>
                            <div className="text-xs text-muted-foreground">{clip.player}</div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Teams */}
            {searchData.teams.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Equipos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {searchData.teams.map((team) => (
                    <Link key={team.id} href={`/play/team/${team.id}`}>
                      <Card className="group hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4 flex items-center gap-4">
                          <Avatar className="w-14 h-14">
                            <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-semibold group-hover:text-primary transition-colors">
                              {team.name}
                            </div>
                            <div className="text-sm text-muted-foreground">{team.league}</div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>#{team.position} en la liga</span>
                              <span>{team.followers} seguidores</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="matches" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchData.matches.map((match) => (
                <Link key={match.id} href={`/play/watch/${match.id}`}>
                  <Card className="group hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4 flex gap-4">
                      <div className="w-32 aspect-video bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <Play className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="text-xs mb-1">
                          {match.league}
                        </Badge>
                        <div className="font-medium line-clamp-1">
                          {match.homeTeam} vs {match.awayTeam}
                        </div>
                        <div className="text-lg font-bold text-primary">{match.score}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {match.views}
                          </span>
                          <span>{match.duration}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="clips" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {searchData.clips.map((clip) => (
                <Link key={clip.id} href={`/play/watch/${clip.id}`}>
                  <Card className="group overflow-hidden hover:bg-muted/50 transition-colors">
                    <CardContent className="p-0">
                      <div className="relative aspect-[9/16] bg-muted">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play className="w-4 h-4 text-accent fill-current ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-xs text-white">
                          {clip.duration}
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="font-medium text-xs line-clamp-2">{clip.title}</div>
                        <div className="text-xs text-muted-foreground">{clip.player}</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchData.teams.map((team) => (
                <Link key={team.id} href={`/play/team/${team.id}`}>
                  <Card className="group hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="w-14 h-14">
                        <AvatarFallback>{team.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-semibold group-hover:text-primary transition-colors">
                          {team.name}
                        </div>
                        <div className="text-sm text-muted-foreground">{team.league}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>#{team.position} en la liga</span>
                          <span>{team.followers} seguidores</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="leagues" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchData.leagues.map((league) => (
                <Link key={league.id} href={`/liga/${league.id}`}>
                  <Card className="group hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold group-hover:text-primary transition-colors">
                          {league.name}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{league.teams} equipos</span>
                          <span>{league.videos} videos</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
