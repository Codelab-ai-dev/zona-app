import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Play,
  Share2,
  Heart,
  ChevronLeft,
  Clock,
  Eye,
  Calendar,
  Flag,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { VideoPlayerWrapper } from "./video-player-wrapper";

interface PageProps {
  params: Promise<{ videoId: string }>;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function getRecording(videoId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("match_recordings")
    .select(`
      *,
      matches (
        id,
        home_score,
        away_score,
        match_date,
        home_team:teams!matches_home_team_id_fkey (id, name),
        away_team:teams!matches_away_team_id_fkey (id, name)
      ),
      leagues (id, name, slug)
    `)
    .eq("id", videoId)
    .single();

  if (error || !data) {
    return null;
  }

  // Incrementar vistas (fire-and-forget)
  supabase
    .from("match_recordings")
    .update({ views_count: (data.views_count || 0) + 1 })
    .eq("id", videoId)
    .then(() => {});

  return data;
}

async function getRelatedVideos(leagueId: string | null, currentId: string) {
  if (!leagueId) return [];

  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("match_recordings")
    .select(`
      id,
      title,
      thumbnail_url,
      duration_seconds,
      views_count,
      matches (
        home_score,
        away_score,
        home_team:teams!matches_home_team_id_fkey (name),
        away_team:teams!matches_away_team_id_fkey (name)
      ),
      leagues (name)
    `)
    .eq("league_id", leagueId)
    .eq("status", "ready")
    .neq("id", currentId)
    .order("created_at", { ascending: false })
    .limit(5);

  return data || [];
}

export default async function WatchPage({ params }: PageProps) {
  const { videoId } = await params;
  const recording = await getRecording(videoId);

  if (!recording) {
    notFound();
  }

  const relatedVideos = await getRelatedVideos(recording.league_id, videoId);

  const match = recording.matches;
  const league = recording.leagues;

  // Determinar título del video
  const videoTitle = match
    ? `${match.home_team?.name || "Local"} vs ${match.away_team?.name || "Visitante"}`
    : recording.title;

  const score = match ? `${match.home_score} - ${match.away_score}` : null;

  return (
    <div className="container max-w-screen-2xl py-8 lg:py-10">
      {/* Back button */}
      <Link href="/play" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Volver
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {recording.status === "ready" && recording.mux_playback_id ? (
              <VideoPlayerWrapper
                playbackId={recording.mux_playback_id}
                title={videoTitle}
                poster={recording.thumbnail_url || undefined}
              />
            ) : recording.status === "processing" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center space-y-4">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                  <div>
                    <p className="font-medium">Procesando video</p>
                    <p className="text-sm text-muted-foreground">
                      Estará disponible en unos minutos...
                    </p>
                  </div>
                </div>
              </div>
            ) : recording.status === "failed" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center space-y-4">
                  <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Error al procesar</p>
                    <p className="text-sm text-muted-foreground">
                      {recording.error_message || "No se pudo procesar el video"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center space-y-4">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Video pendiente</p>
                </div>
              </div>
            )}
          </div>

          {/* Match Info */}
          <div className="space-y-4">
            {/* Title and badges */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {league && (
                    <Badge variant="outline" className="border-primary/50 text-primary">
                      {league.name}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">{recording.title}</span>
                </div>
                <h1 className="text-2xl font-bold">{videoTitle}</h1>
              </div>
              {score && (
                <div className="text-4xl font-bold text-primary">{score}</div>
              )}
            </div>

            {/* Stats and Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  {(recording.views_count || 0).toLocaleString()} vistas
                </span>
                {recording.published_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {new Date(recording.published_at).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {formatDuration(recording.duration_seconds)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Heart className="w-4 h-4 mr-2" />
                  {recording.likes_count || 0}
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartir
                </Button>
              </div>
            </div>

            <Separator />

            {/* Teams */}
            {match && (
              <div className="grid grid-cols-2 gap-4 py-4">
                <Link href={`/play/team/${match.home_team?.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src="" />
                        <AvatarFallback>{match.home_team?.name?.slice(0, 2) || "LC"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{match.home_team?.name || "Local"}</div>
                        <div className="text-sm text-muted-foreground">Local</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href={`/play/team/${match.away_team?.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src="" />
                        <AvatarFallback>{match.away_team?.name?.slice(0, 2) || "VS"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{match.away_team?.name || "Visitante"}</div>
                        <div className="text-sm text-muted-foreground">Visitante</div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            )}

            {/* Description */}
            {recording.description && (
              <div className="space-y-2">
                <h3 className="font-semibold">Descripción</h3>
                <p className="text-muted-foreground">{recording.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Related Videos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Videos Relacionados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {relatedVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay videos relacionados
                </p>
              ) : (
                relatedVideos.map((video: any) => (
                  <Link key={video.id} href={`/play/watch/${video.id}`}>
                    <div className="flex gap-3 p-2 rounded-md hover:bg-muted transition-colors">
                      <div className="w-28 aspect-video bg-muted rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Play className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm line-clamp-2">
                          {video.matches
                            ? `${video.matches.home_team?.name} vs ${video.matches.away_team?.name}`
                            : video.title}
                        </div>
                        {video.matches && (
                          <div className="text-primary font-bold text-sm mt-1">
                            {video.matches.home_score} - {video.matches.away_score}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {video.leagues?.name || ""}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
