import Link from "next/link";
import { Play, Eye, Heart, Share2, Filter, TrendingUp, Clock, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Datos de ejemplo
const clips = [
  {
    id: "clip-1",
    title: "Golazo de media cancha",
    player: "Carlos Hernández",
    team: "Tigres FC",
    league: "Liga Premier",
    duration: "0:45",
    views: 34200,
    likes: 2340,
    type: "goal",
    thumbnail: "/placeholder-clip.jpg",
    createdAt: "2024-12-20",
  },
  {
    id: "clip-2",
    title: "Atajada imposible en el último minuto",
    player: "Miguel Torres",
    team: "Leones United",
    league: "Liga Premier",
    duration: "0:32",
    views: 21500,
    likes: 1890,
    type: "save",
    thumbnail: "/placeholder-clip.jpg",
    createdAt: "2024-12-19",
  },
  {
    id: "clip-3",
    title: "Jugada de fantasía - túnel y gol",
    player: "Juan López",
    team: "Águilas FC",
    league: "Liga Amateur",
    duration: "0:58",
    views: 18900,
    likes: 1456,
    type: "highlight",
    thumbnail: "/placeholder-clip.jpg",
    createdAt: "2024-12-19",
  },
  {
    id: "clip-4",
    title: "Gol de último minuto - Remontada épica",
    player: "Roberto Sánchez",
    team: "Rayos",
    league: "Copa Local",
    duration: "0:40",
    views: 42000,
    likes: 3200,
    type: "goal",
    thumbnail: "/placeholder-clip.jpg",
    createdAt: "2024-12-18",
  },
  {
    id: "clip-5",
    title: "Doble atajada espectacular",
    player: "Fernando Díaz",
    team: "Halcones",
    league: "Liga Amateur",
    duration: "0:35",
    views: 15600,
    likes: 1234,
    type: "save",
    thumbnail: "/placeholder-clip.jpg",
    createdAt: "2024-12-18",
  },
  {
    id: "clip-6",
    title: "Golazo de tiro libre",
    player: "Pedro Martínez",
    team: "Pumas Jr",
    league: "Liga Premier",
    duration: "0:28",
    views: 28900,
    likes: 2100,
    type: "goal",
    thumbnail: "/placeholder-clip.jpg",
    createdAt: "2024-12-17",
  },
  {
    id: "clip-7",
    title: "Chilena perfecta",
    player: "Luis García",
    team: "Toros FC",
    league: "Liga Amateur",
    duration: "0:22",
    views: 52000,
    likes: 4500,
    type: "goal",
    thumbnail: "/placeholder-clip.jpg",
    createdAt: "2024-12-17",
  },
  {
    id: "clip-8",
    title: "Penal atajado y contragolpe",
    player: "Carlos Ruiz",
    team: "Dragones",
    league: "Liga Premier",
    duration: "0:52",
    views: 19800,
    likes: 1650,
    type: "save",
    thumbnail: "/placeholder-clip.jpg",
    createdAt: "2024-12-16",
  },
];

const typeColors = {
  goal: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/50" },
  save: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/50" },
  highlight: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/50" },
};

const typeLabels = {
  goal: "Gol",
  save: "Atajada",
  highlight: "Highlight",
};

function ClipCard({ clip }: { clip: typeof clips[0] }) {
  const colors = typeColors[clip.type as keyof typeof typeColors];

  return (
    <Link href={`/play/watch/${clip.id}`}>
      <Card className="group overflow-hidden bg-card hover:bg-muted/50 transition-all duration-300 border-border/50 hover:border-accent/50 h-full">
        <CardContent className="p-0">
          {/* Thumbnail - Vertical aspect ratio for clips */}
          <div className="relative aspect-[9/16] bg-muted">
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-transparent to-black/60">
              <div className="w-14 h-14 rounded-full bg-background/80 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-accent fill-current ml-0.5" />
              </div>
            </div>

            {/* Duration */}
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-xs text-white font-medium">
              {clip.duration}
            </div>

            {/* Type Badge */}
            <div className="absolute top-2 left-2">
              <Badge className={`text-xs ${colors.bg} ${colors.text} border ${colors.border}`}>
                {typeLabels[clip.type as keyof typeof typeLabels]}
              </Badge>
            </div>

            {/* Views overlay */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white/90 text-xs">
              <Eye className="w-3 h-3" />
              {clip.views >= 1000 ? `${(clip.views / 1000).toFixed(1)}K` : clip.views}
            </div>
          </div>

          {/* Info */}
          <div className="p-3 space-y-2">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-accent transition-colors">
              {clip.title}
            </h3>
            <div className="text-xs text-muted-foreground">
              {clip.player} • {clip.team}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{clip.league}</span>
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {clip.likes >= 1000 ? `${(clip.likes / 1000).toFixed(1)}K` : clip.likes}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ClipCardHorizontal({ clip }: { clip: typeof clips[0] }) {
  const colors = typeColors[clip.type as keyof typeof typeColors];

  return (
    <Link href={`/play/watch/${clip.id}`}>
      <Card className="group overflow-hidden bg-card hover:bg-muted/50 transition-all duration-300 border-border/50 hover:border-accent/50">
        <CardContent className="p-0">
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="relative w-40 aspect-video bg-muted flex-shrink-0 rounded-l-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 text-accent fill-current ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-xs text-white font-medium">
                {clip.duration}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 py-3 pr-4 flex flex-col justify-center">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <Badge className={`text-xs ${colors.bg} ${colors.text} border ${colors.border}`}>
                    {typeLabels[clip.type as keyof typeof typeLabels]}
                  </Badge>
                  <h3 className="font-medium text-sm line-clamp-1 group-hover:text-accent transition-colors">
                    {clip.title}
                  </h3>
                  <div className="text-xs text-muted-foreground">
                    {clip.player} • {clip.team}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {clip.views >= 1000 ? `${(clip.views / 1000).toFixed(1)}K` : clip.views}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {clip.likes >= 1000 ? `${(clip.likes / 1000).toFixed(1)}K` : clip.likes}
                </span>
                <span>{clip.league}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ClipsPage() {
  const trendingClips = [...clips].sort((a, b) => b.views - a.views).slice(0, 4);
  const recentClips = [...clips].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const goalClips = clips.filter(c => c.type === "goal");
  const saveClips = clips.filter(c => c.type === "save");

  return (
    <div className="container max-w-screen-2xl py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clips</h1>
          <p className="text-muted-foreground">Las mejores jugadas del fútbol amateur</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
        </div>
      </div>

      {/* Trending Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-bold">Trending</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {trendingClips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} />
          ))}
        </div>
      </section>

      {/* Tabs for different categories */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Todos
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Goles
          </TabsTrigger>
          <TabsTrigger value="saves" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Atajadas
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {goalClips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="saves" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {saveClips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-3">
          {recentClips.map((clip) => (
            <ClipCardHorizontal key={clip.id} clip={clip} />
          ))}
        </TabsContent>
      </Tabs>

      {/* Load More */}
      <div className="flex justify-center pt-4">
        <Button variant="outline" size="lg">
          Cargar más clips
        </Button>
      </div>
    </div>
  );
}
