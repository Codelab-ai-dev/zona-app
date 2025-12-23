import Link from "next/link";
import { Play, Clock, Eye, Calendar, ChevronRight, Tv } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Datos de ejemplo - después vendrán de la BD
const featuredMatch = {
  id: "featured-1",
  title: "Liga Premier - Final",
  homeTeam: "Tigres FC",
  awayTeam: "Leones United",
  score: "3 - 2",
  thumbnail: "/placeholder-match.jpg",
  duration: "1:45:30",
  views: 1250,
  date: "2024-12-20",
  league: "Liga Premier",
  isLive: false,
};

const recentMatches = [
  {
    id: "match-1",
    title: "Jornada 15",
    homeTeam: "Águilas FC",
    awayTeam: "Halcones",
    score: "2 - 1",
    thumbnail: "/placeholder-match.jpg",
    duration: "1:32:15",
    views: 458,
    date: "2024-12-19",
    league: "Liga Amateur",
  },
  {
    id: "match-2",
    title: "Semifinal Copa Local",
    homeTeam: "Rayos",
    awayTeam: "Toros FC",
    score: "1 - 1 (4-3 pen)",
    thumbnail: "/placeholder-match.jpg",
    duration: "2:05:00",
    views: 892,
    date: "2024-12-18",
    league: "Copa Local",
  },
  {
    id: "match-3",
    title: "Jornada 14",
    homeTeam: "Pumas Jr",
    awayTeam: "Chivas Local",
    score: "0 - 3",
    thumbnail: "/placeholder-match.jpg",
    duration: "1:28:45",
    views: 325,
    date: "2024-12-17",
    league: "Liga Premier",
  },
  {
    id: "match-4",
    title: "Jornada 13",
    homeTeam: "América Local",
    awayTeam: "Cruz Azul Jr",
    score: "2 - 2",
    thumbnail: "/placeholder-match.jpg",
    duration: "1:35:20",
    views: 567,
    date: "2024-12-15",
    league: "Liga Amateur",
  },
];

const featuredClips = [
  {
    id: "clip-1",
    title: "Golazo de media cancha",
    player: "Carlos Hernández",
    team: "Tigres FC",
    duration: "0:45",
    views: 3420,
    type: "goal",
  },
  {
    id: "clip-2",
    title: "Atajada imposible",
    player: "Miguel Torres",
    team: "Leones United",
    duration: "0:32",
    views: 2150,
    type: "save",
  },
  {
    id: "clip-3",
    title: "Jugada de fantasía",
    player: "Juan López",
    team: "Águilas FC",
    duration: "0:58",
    views: 1890,
    type: "highlight",
  },
  {
    id: "clip-4",
    title: "Gol de último minuto",
    player: "Roberto Sánchez",
    team: "Rayos",
    duration: "0:40",
    views: 4200,
    type: "goal",
  },
];

const liveStreams = [
  {
    id: "live-1",
    title: "Liga Premier - Jornada 16",
    homeTeam: "Dragones",
    awayTeam: "Fénix FC",
    viewers: 156,
    league: "Liga Premier",
  },
];

function VideoCard({ match }: { match: typeof recentMatches[0] }) {
  return (
    <Link href={`/play/watch/${match.id}`}>
      <Card className="group overflow-hidden bg-card hover:bg-muted/50 transition-all duration-300 border-border/50 hover:border-primary/50">
        <CardContent className="p-0">
          {/* Thumbnail */}
          <div className="relative aspect-video bg-muted">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-background/80 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-primary fill-current ml-1" />
              </div>
            </div>
            {/* Duration badge */}
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-xs text-white font-medium">
              {match.duration}
            </div>
            {/* League badge */}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-primary/90 text-primary-foreground text-xs">
                {match.league}
              </Badge>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              {match.title}
            </div>
            <div className="font-semibold text-lg">
              {match.homeTeam} vs {match.awayTeam}
            </div>
            <div className="text-2xl font-bold text-primary">
              {match.score}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {match.views.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(match.date).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short"
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ClipCard({ clip }: { clip: typeof featuredClips[0] }) {
  const typeColors = {
    goal: "bg-green-500/20 text-green-400",
    save: "bg-blue-500/20 text-blue-400",
    highlight: "bg-yellow-500/20 text-yellow-400",
  };

  return (
    <Link href={`/play/watch/${clip.id}`}>
      <Card className="group overflow-hidden bg-card hover:bg-muted/50 transition-all duration-300 border-border/50 hover:border-accent/50">
        <CardContent className="p-0">
          <div className="relative aspect-[9/16] bg-muted max-h-[280px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-background/80 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 text-accent fill-current ml-0.5" />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-xs text-white font-medium">
              {clip.duration}
            </div>
            <div className="absolute top-2 left-2">
              <Badge className={`text-xs ${typeColors[clip.type as keyof typeof typeColors]}`}>
                {clip.type === "goal" ? "Gol" : clip.type === "save" ? "Atajada" : "Highlight"}
              </Badge>
            </div>
          </div>
          <div className="p-3 space-y-1">
            <div className="font-medium text-sm line-clamp-2">{clip.title}</div>
            <div className="text-xs text-muted-foreground">{clip.player}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Eye className="w-3 h-3" />
              {clip.views.toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function LiveBanner() {
  if (liveStreams.length === 0) return null;

  const stream = liveStreams[0];

  return (
    <Link href={`/play/live/${stream.id}`}>
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-red-600 to-pink-600 p-4 sm:p-6 mb-8 group hover:from-red-500 hover:to-pink-500 transition-all">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-white animate-pulse" />
              <span className="text-white font-bold text-sm uppercase tracking-wide">En Vivo</span>
            </div>
            <div className="hidden sm:block w-px h-8 bg-white/30" />
            <div className="text-white">
              <div className="text-sm opacity-80">{stream.league}</div>
              <div className="font-semibold">{stream.homeTeam} vs {stream.awayTeam}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 text-white/80 text-sm">
              <Eye className="w-4 h-4" />
              {stream.viewers}
            </div>
            <Button size="sm" variant="secondary" className="group-hover:bg-white group-hover:text-red-600">
              <Tv className="w-4 h-4 mr-2" />
              Ver ahora
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function PlayHomePage() {
  return (
    <div className="container max-w-screen-2xl py-6 space-y-10">
      {/* Live Banner */}
      <LiveBanner />

      {/* Featured Match */}
      <section>
        <Link href={`/play/watch/${featuredMatch.id}`}>
          <Card className="group overflow-hidden bg-card hover:bg-muted/30 transition-all duration-300 border-border/50 hover:border-primary/50">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-muted">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-background/80 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-primary fill-current ml-1" />
                    </div>
                  </div>
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-primary text-primary-foreground">
                      Destacado
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded bg-black/80 text-sm text-white font-medium">
                    {featuredMatch.duration}
                  </div>
                </div>

                {/* Info */}
                <div className="p-6 md:p-8 flex flex-col justify-center space-y-4">
                  <div className="space-y-2">
                    <Badge variant="outline" className="border-primary/50 text-primary">
                      {featuredMatch.league}
                    </Badge>
                    <h2 className="text-2xl md:text-3xl font-bold">
                      {featuredMatch.homeTeam} vs {featuredMatch.awayTeam}
                    </h2>
                  </div>
                  <div className="text-4xl md:text-5xl font-bold text-primary">
                    {featuredMatch.score}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      {featuredMatch.views.toLocaleString()} vistas
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {featuredMatch.duration}
                    </span>
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(featuredMatch.date).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Recent Matches */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Partidos Recientes</h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Ver todos <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentMatches.map((match) => (
            <VideoCard key={match.id} match={match} />
          ))}
        </div>
      </section>

      {/* Featured Clips */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Clips Destacados</h2>
          <Link href="/play/clips">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Ver todos <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {featuredClips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} />
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center py-12 space-y-4">
        <h2 className="text-2xl font-bold">Revive cada jugada de tu liga</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Accede a partidos completos, highlights y clips de las mejores jugadas del fútbol amateur
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link href="/">
            <Button variant="outline">
              Explorar ligas
            </Button>
          </Link>
          <Link href="/play/clips">
            <Button className="bg-primary hover:bg-primary/90">
              Ver clips
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
