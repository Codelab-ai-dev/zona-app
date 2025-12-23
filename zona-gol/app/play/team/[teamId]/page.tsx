import Link from "next/link";
import {
  Play,
  Eye,
  Calendar,
  ChevronLeft,
  Users,
  Trophy,
  Video,
  TrendingUp,
  Heart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

// Datos de ejemplo
const getTeamData = (teamId: string) => ({
  id: teamId,
  name: "Tigres FC",
  logo: "/placeholder-team.png",
  banner: "/placeholder-banner.jpg",
  league: {
    name: "Liga Premier",
    slug: "liga-premier",
  },
  stats: {
    matches: 24,
    wins: 16,
    draws: 5,
    losses: 3,
    goalsFor: 48,
    goalsAgainst: 21,
    position: 1,
  },
  followers: 1250,
  totalViews: 45600,
  videos: [
    {
      id: "v1",
      title: "Tigres FC vs Leones United - Final",
      opponent: "Leones United",
      score: "3 - 2",
      result: "win",
      duration: "1:45:30",
      views: 1250,
      date: "2024-12-20",
      type: "match",
    },
    {
      id: "v2",
      title: "Tigres FC vs Águilas - Semifinal",
      opponent: "Águilas FC",
      score: "4 - 2",
      result: "win",
      duration: "1:38:15",
      views: 890,
      date: "2024-12-15",
      type: "match",
    },
    {
      id: "v3",
      title: "Tigres FC vs Halcones - Jornada 14",
      opponent: "Halcones",
      score: "2 - 2",
      result: "draw",
      duration: "1:32:00",
      views: 567,
      date: "2024-12-10",
      type: "match",
    },
  ],
  clips: [
    {
      id: "c1",
      title: "Golazo de media cancha",
      player: "Carlos Hernández",
      duration: "0:45",
      views: 34200,
      type: "goal",
    },
    {
      id: "c2",
      title: "Jugada colectiva perfecta",
      player: "Equipo",
      duration: "0:58",
      views: 12500,
      type: "highlight",
    },
    {
      id: "c3",
      title: "Hat-trick de Carlos",
      player: "Carlos Hernández",
      duration: "1:20",
      views: 8900,
      type: "goal",
    },
  ],
  topPlayers: [
    { name: "Carlos Hernández", position: "Delantero", goals: 18, assists: 7 },
    { name: "Juan López", position: "Mediocampista", goals: 8, assists: 12 },
    { name: "Miguel Torres", position: "Portero", saves: 45, cleanSheets: 8 },
  ],
});

function VideoCard({ video }: { video: ReturnType<typeof getTeamData>["videos"][0] }) {
  const resultColors = {
    win: "bg-green-500/20 text-green-400 border-green-500/50",
    draw: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    loss: "bg-red-500/20 text-red-400 border-red-500/50",
  };

  const resultLabels = {
    win: "Victoria",
    draw: "Empate",
    loss: "Derrota",
  };

  return (
    <Link href={`/play/watch/${video.id}`}>
      <Card className="group overflow-hidden bg-card hover:bg-muted/50 transition-all duration-300 border-border/50 hover:border-primary/50">
        <CardContent className="p-0">
          <div className="relative aspect-video bg-muted">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-background/80 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-primary fill-current ml-1" />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-xs text-white font-medium">
              {video.duration}
            </div>
            <div className="absolute top-2 left-2">
              <Badge className={`text-xs border ${resultColors[video.result as keyof typeof resultColors]}`}>
                {resultLabels[video.result as keyof typeof resultLabels]}
              </Badge>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <div className="font-medium line-clamp-1">{video.title}</div>
            <div className="text-2xl font-bold text-primary">{video.score}</div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {video.views.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(video.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ClipCard({ clip }: { clip: ReturnType<typeof getTeamData>["clips"][0] }) {
  const typeColors = {
    goal: "bg-green-500/20 text-green-400",
    highlight: "bg-yellow-500/20 text-yellow-400",
  };

  return (
    <Link href={`/play/watch/${clip.id}`}>
      <Card className="group overflow-hidden bg-card hover:bg-muted/50 transition-all duration-300 border-border/50 hover:border-accent/50">
        <CardContent className="p-0">
          <div className="relative aspect-[9/16] bg-muted max-h-[200px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-4 h-4 text-accent fill-current ml-0.5" />
              </div>
            </div>
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-xs text-white">
              {clip.duration}
            </div>
            <div className="absolute top-1 left-1">
              <Badge className={`text-xs ${typeColors[clip.type as keyof typeof typeColors]}`}>
                {clip.type === "goal" ? "Gol" : "Highlight"}
              </Badge>
            </div>
          </div>
          <div className="p-2 space-y-1">
            <div className="font-medium text-xs line-clamp-2">{clip.title}</div>
            <div className="text-xs text-muted-foreground">{clip.player}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="w-3 h-3" />
              {clip.views >= 1000 ? `${(clip.views / 1000).toFixed(1)}K` : clip.views}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function TeamPage({ params }: PageProps) {
  const { teamId } = await params;
  const team = getTeamData(teamId);

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/30 to-accent/30">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container max-w-screen-2xl -mt-20 relative z-10">
        {/* Back button */}
        <Link href="/play" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Volver
        </Link>

        {/* Team Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-8">
          <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
            <AvatarImage src={team.logo} />
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
              {team.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{team.name}</h1>
              <Badge variant="outline" className="border-primary/50 text-primary">
                #{team.stats.position} en la liga
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href={`/liga/${team.league.slug}`} className="hover:text-foreground transition-colors">
                {team.league.name}
              </Link>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {team.followers.toLocaleString()} seguidores
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {team.totalViews.toLocaleString()} vistas totales
              </span>
            </div>
          </div>

          <Button className="bg-primary hover:bg-primary/90">
            <Heart className="w-4 h-4 mr-2" />
            Seguir
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-primary">{team.stats.wins}</div>
              <div className="text-sm text-muted-foreground">Victorias</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-500">{team.stats.draws}</div>
              <div className="text-sm text-muted-foreground">Empates</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-500">{team.stats.losses}</div>
              <div className="text-sm text-muted-foreground">Derrotas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-foreground">
                {team.stats.goalsFor}:{team.stats.goalsAgainst}
              </div>
              <div className="text-sm text-muted-foreground">Goles</div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Partidos
            </TabsTrigger>
            <TabsTrigger value="clips" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Clips
            </TabsTrigger>
            <TabsTrigger value="players" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Jugadores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
            {team.videos.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No hay videos disponibles todavía
              </div>
            )}
          </TabsContent>

          <TabsContent value="clips" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {team.clips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} />
              ))}
            </div>
            {team.clips.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No hay clips disponibles todavía
              </div>
            )}
          </TabsContent>

          <TabsContent value="players" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.topPlayers.map((player, index) => (
                <Card key={index}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="w-14 h-14">
                      <AvatarFallback>{player.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-sm text-muted-foreground">{player.position}</div>
                    </div>
                    <div className="text-right">
                      {player.goals !== undefined && (
                        <div className="text-sm">
                          <span className="font-bold text-primary">{player.goals}</span> goles
                        </div>
                      )}
                      {player.assists !== undefined && (
                        <div className="text-sm">
                          <span className="font-bold text-accent">{player.assists}</span> asistencias
                        </div>
                      )}
                      {player.saves !== undefined && (
                        <div className="text-sm">
                          <span className="font-bold text-blue-400">{player.saves}</span> atajadas
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
