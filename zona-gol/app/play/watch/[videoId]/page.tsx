import Link from "next/link";
import {
  Play,
  Pause,
  Volume2,
  Maximize,
  Share2,
  Heart,
  ChevronLeft,
  Clock,
  Eye,
  Calendar,
  Users,
  Flag,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PageProps {
  params: Promise<{ videoId: string }>;
}

// Datos de ejemplo - después vendrán de la BD
const getMatchData = (videoId: string) => ({
  id: videoId,
  title: "Liga Premier - Final",
  homeTeam: {
    name: "Tigres FC",
    logo: "/placeholder-team.png",
    score: 3,
  },
  awayTeam: {
    name: "Leones United",
    logo: "/placeholder-team.png",
    score: 2,
  },
  thumbnail: "/placeholder-match.jpg",
  videoUrl: "", // Aquí irá el Mux playback URL
  duration: "1:45:30",
  views: 1250,
  likes: 89,
  date: "2024-12-20",
  league: {
    name: "Liga Premier",
    slug: "liga-premier",
  },
  description: "Final emocionante de la Liga Premier con goles espectaculares. Los Tigres se coronan campeones tras un partido muy disputado.",
  highlights: [
    { time: "12:30", title: "Gol de Carlos Hernández", type: "goal", team: "home" },
    { time: "28:45", title: "Gol de penal - Roberto Sánchez", type: "goal", team: "away" },
    { time: "45:00", title: "Fin del primer tiempo", type: "break", team: null },
    { time: "52:15", title: "Golazo de media cancha", type: "goal", team: "home" },
    { time: "67:30", title: "Empate de Juan López", type: "goal", team: "away" },
    { time: "89:00", title: "Gol de la victoria", type: "goal", team: "home" },
  ],
  relatedVideos: [
    { id: "rel-1", title: "Tigres FC vs Águilas", score: "2 - 0", league: "Liga Premier" },
    { id: "rel-2", title: "Leones vs Halcones", score: "1 - 1", league: "Liga Premier" },
    { id: "rel-3", title: "Semifinal - Tigres FC", score: "4 - 2", league: "Liga Premier" },
  ],
});

export default async function WatchPage({ params }: PageProps) {
  const { videoId } = await params;
  const match = getMatchData(videoId);

  return (
    <div className="container max-w-screen-2xl py-4 lg:py-6">
      {/* Back button */}
      <Link href="/play" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Volver
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
            {/* Placeholder for video player */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/30 transition-colors">
                  <Play className="w-8 h-8 text-primary fill-current ml-1" />
                </div>
                <p className="text-muted-foreground text-sm">
                  Player de video (Mux)
                </p>
              </div>
            </div>

            {/* Video Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Progress bar */}
              <div className="w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer">
                <div className="h-full w-1/3 bg-primary rounded-full" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button className="text-white hover:text-primary transition-colors">
                    <Play className="w-6 h-6" />
                  </button>
                  <button className="text-white hover:text-primary transition-colors">
                    <Volume2 className="w-5 h-5" />
                  </button>
                  <span className="text-white text-sm">0:00 / {match.duration}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-white hover:text-primary transition-colors">
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Match Info */}
          <div className="space-y-4">
            {/* Title and badges */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/50 text-primary">
                    {match.league.name}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{match.title}</span>
                </div>
                <h1 className="text-2xl font-bold">
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </h1>
              </div>
              <div className="text-4xl font-bold text-primary">
                {match.homeTeam.score} - {match.awayTeam.score}
              </div>
            </div>

            {/* Stats and Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  {match.views.toLocaleString()} vistas
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(match.date).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {match.duration}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Heart className="w-4 h-4 mr-2" />
                  {match.likes}
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartir
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </div>

            <Separator />

            {/* Teams */}
            <div className="grid grid-cols-2 gap-4 py-4">
              <Link href={`/play/team/${match.homeTeam.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={match.homeTeam.logo} />
                      <AvatarFallback>{match.homeTeam.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{match.homeTeam.name}</div>
                      <div className="text-sm text-muted-foreground">Local</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href={`/play/team/${match.awayTeam.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={match.awayTeam.logo} />
                      <AvatarFallback>{match.awayTeam.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{match.awayTeam.name}</div>
                      <div className="text-sm text-muted-foreground">Visitante</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="font-semibold">Descripción</h3>
              <p className="text-muted-foreground">{match.description}</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Highlights Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Flag className="w-4 h-4 text-primary" />
                Momentos Clave
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {match.highlights.map((highlight, index) => (
                <button
                  key={index}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                >
                  <span className="text-sm font-mono text-primary w-12">{highlight.time}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{highlight.title}</div>
                    {highlight.type === "goal" && (
                      <Badge
                        variant="outline"
                        className={`text-xs mt-1 ${
                          highlight.team === "home"
                            ? "border-green-500/50 text-green-400"
                            : "border-blue-500/50 text-blue-400"
                        }`}
                      >
                        {highlight.team === "home" ? match.homeTeam.name : match.awayTeam.name}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Related Videos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Videos Relacionados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {match.relatedVideos.map((video) => (
                <Link key={video.id} href={`/play/watch/${video.id}`}>
                  <div className="flex gap-3 p-2 rounded-md hover:bg-muted transition-colors">
                    <div className="w-28 aspect-video bg-muted rounded flex items-center justify-center flex-shrink-0">
                      <Play className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm line-clamp-2">{video.title}</div>
                      <div className="text-primary font-bold text-sm mt-1">{video.score}</div>
                      <div className="text-xs text-muted-foreground">{video.league}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
