import Link from "next/link";
import {
  Play,
  Volume2,
  Maximize,
  Share2,
  Heart,
  ChevronLeft,
  Eye,
  Users,
  MessageCircle,
  Send,
  Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PageProps {
  params: Promise<{ streamId: string }>;
}

// Datos de ejemplo
const getStreamData = (streamId: string) => ({
  id: streamId,
  title: "Liga Premier - Jornada 16",
  homeTeam: {
    name: "Dragones",
    logo: "/placeholder-team.png",
    score: 1,
  },
  awayTeam: {
    name: "Fénix FC",
    logo: "/placeholder-team.png",
    score: 1,
  },
  status: "live" as const,
  viewers: 156,
  peakViewers: 234,
  startedAt: new Date(Date.now() - 45 * 60 * 1000), // Hace 45 minutos
  matchMinute: 45,
  league: {
    name: "Liga Premier",
    slug: "liga-premier",
  },
  broadcaster: {
    name: "Liga Premier Oficial",
    avatar: "/placeholder-user.png",
  },
  chatMessages: [
    { id: 1, user: "FanTigres", message: "Vamos Dragones!", time: "hace 2 min" },
    { id: 2, user: "FutbolMX", message: "Que partidazo", time: "hace 1 min" },
    { id: 3, user: "GoalHunter", message: "El portero está jugando increíble", time: "hace 45 seg" },
    { id: 4, user: "Pedro123", message: "Necesitan meter más presión", time: "hace 30 seg" },
    { id: 5, user: "LaAfi_cion", message: "Ese si era penal!", time: "hace 15 seg" },
    { id: 6, user: "System", message: "⚽ Gol de Dragones - Carlos Hernández (45')", time: "ahora", isSystem: true },
  ],
  recentEvents: [
    { minute: 45, event: "Gol", description: "Carlos Hernández anota de cabeza", team: "home" },
    { minute: 38, event: "Tarjeta", description: "Amarilla para Juan López", team: "away" },
    { minute: 22, event: "Gol", description: "Roberto Sánchez de penal", team: "away" },
    { minute: 15, event: "Tiro al poste", description: "Casi gol de Dragones", team: "home" },
  ],
});

export default async function LiveStreamPage({ params }: PageProps) {
  const { streamId } = await params;
  const stream = getStreamData(streamId);

  const elapsedMinutes = Math.floor((Date.now() - stream.startedAt.getTime()) / 60000);

  return (
    <div className="container max-w-screen-2xl py-4">
      {/* Back button */}
      <Link href="/play" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Volver
      </Link>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main Content - Video and Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live Video Player */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {/* Live indicator */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
              <Badge className="bg-red-600 text-white flex items-center gap-1.5 px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                EN VIVO
              </Badge>
              <Badge variant="secondary" className="bg-black/60 text-white">
                <Eye className="w-3 h-3 mr-1.5" />
                {stream.viewers}
              </Badge>
            </div>

            {/* Match minute */}
            <div className="absolute top-4 right-4 z-10">
              <Badge variant="secondary" className="bg-black/60 text-white text-lg px-3 py-1">
                {stream.matchMinute}&apos;
              </Badge>
            </div>

            {/* Placeholder for live player */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-900/30 to-purple-900/30">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-red-600/30 flex items-center justify-center animate-pulse">
                  <Play className="w-8 h-8 text-white fill-current ml-1" />
                </div>
                <p className="text-white/70 text-sm">
                  Stream en vivo (Mux Live)
                </p>
              </div>
            </div>

            {/* Video Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button className="text-white hover:text-red-400 transition-colors">
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-white hover:text-red-400 transition-colors">
                    <Settings className="w-5 h-5" />
                  </button>
                  <button className="text-white hover:text-red-400 transition-colors">
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Match Score Card */}
          <Card className="border-red-500/30 bg-gradient-to-r from-card to-red-950/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {/* Home Team */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={stream.homeTeam.logo} />
                    <AvatarFallback className="text-lg">{stream.homeTeam.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-xl">{stream.homeTeam.name}</div>
                    <div className="text-sm text-muted-foreground">Local</div>
                  </div>
                </div>

                {/* Score */}
                <div className="text-center">
                  <div className="text-5xl font-bold">
                    <span className="text-foreground">{stream.homeTeam.score}</span>
                    <span className="text-muted-foreground mx-3">-</span>
                    <span className="text-foreground">{stream.awayTeam.score}</span>
                  </div>
                  <Badge variant="outline" className="mt-2 border-red-500/50 text-red-400">
                    {stream.matchMinute}&apos; - En juego
                  </Badge>
                </div>

                {/* Away Team */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-xl">{stream.awayTeam.name}</div>
                    <div className="text-sm text-muted-foreground">Visitante</div>
                  </div>
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={stream.awayTeam.logo} />
                    <AvatarFallback className="text-lg">{stream.awayTeam.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions and Info */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={stream.broadcaster.avatar} />
                <AvatarFallback>LP</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{stream.broadcaster.name}</div>
                <div className="text-sm text-muted-foreground">{stream.league.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Heart className="w-4 h-4 mr-2" />
                Seguir
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </Button>
            </div>
          </div>

          {/* Recent Events */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Eventos del Partido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stream.recentEvents.map((event, index) => (
                  <div key={index} className="flex items-center gap-4 p-2 rounded-md hover:bg-muted/50">
                    <Badge
                      variant="outline"
                      className={`w-12 justify-center ${
                        event.team === "home"
                          ? "border-blue-500/50 text-blue-400"
                          : "border-orange-500/50 text-orange-400"
                      }`}
                    >
                      {event.minute}&apos;
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium">{event.event}</div>
                      <div className="text-sm text-muted-foreground">{event.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Chat */}
        <div className="lg:col-span-1">
          <Card className="h-[calc(100vh-200px)] flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  Chat en Vivo
                </div>
                <Badge variant="secondary" className="font-normal">
                  <Users className="w-3 h-3 mr-1" />
                  {stream.viewers}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              {/* Chat Messages */}
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-3 py-2">
                  {stream.chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`text-sm ${
                        (msg as { isSystem?: boolean }).isSystem
                          ? "bg-green-500/20 text-green-400 p-2 rounded-md text-center font-medium"
                          : ""
                      }`}
                    >
                      {!(msg as { isSystem?: boolean }).isSystem && (
                        <>
                          <span className="font-semibold text-primary">{msg.user}: </span>
                          <span className="text-foreground">{msg.message}</span>
                          <span className="text-muted-foreground text-xs ml-2">{msg.time}</span>
                        </>
                      )}
                      {(msg as { isSystem?: boolean }).isSystem && msg.message}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 border-t border-border flex-shrink-0">
                <form className="flex gap-2">
                  <Input
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-muted border-0"
                  />
                  <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Inicia sesión para chatear
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
