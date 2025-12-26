import Link from "next/link";
import { Play, Clock, Eye, Calendar, ChevronRight, Tv, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface Recording {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  views_count: number;
  created_at: string;
  published_at: string | null;
  home_score: number | null;
  away_score: number | null;
  matches: {
    home_score: number;
    away_score: number;
    home_team: { name: string } | null;
    away_team: { name: string } | null;
  } | null;
  leagues: { name: string; slug: string } | null;
}

async function getVideos() {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("match_recordings")
    .select(`
      id,
      title,
      description,
      thumbnail_url,
      duration_seconds,
      views_count,
      created_at,
      published_at,
      home_score,
      away_score,
      matches (
        home_score,
        away_score,
        home_team:teams!matches_home_team_id_fkey (name),
        away_team:teams!matches_away_team_id_fkey (name)
      ),
      leagues (name, slug)
    `)
    .eq("status", "ready")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(10);

  return (data || []) as Recording[];
}

async function getLiveStreams() {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("live_streams")
    .select(`
      id,
      title,
      current_viewers,
      matches (
        home_team:teams!matches_home_team_id_fkey (name),
        away_team:teams!matches_away_team_id_fkey (name)
      ),
      leagues (name)
    `)
    .eq("status", "live")
    .limit(1);

  return data || [];
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

function VideoCard({ video }: { video: Recording }) {
  const match = video.matches;
  const league = video.leagues;

  const title = match
    ? `${match.home_team?.name || "Local"} vs ${match.away_team?.name || "Visitante"}`
    : video.title;

  // Usar marcador del recording si existe, sino del match
  const score = (video.home_score !== null && video.away_score !== null)
    ? `${video.home_score} - ${video.away_score}`
    : match ? `${match.home_score} - ${match.away_score}` : null;

  return (
    <Link href={`/play/watch/${video.id}`}>
      <Card className="group overflow-hidden bg-card hover:bg-muted/50 transition-all duration-300 border-border/50 hover:border-primary/50">
        <CardContent className="p-0">
          {/* Thumbnail */}
          <div className="relative aspect-video bg-muted">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="w-12 h-12 text-muted-foreground/50" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <div className="w-16 h-16 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
                <Play className="w-6 h-6 text-primary fill-current ml-1" />
              </div>
            </div>
            {/* Duration badge */}
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-xs text-white font-medium">
              {formatDuration(video.duration_seconds)}
            </div>
            {/* League badge */}
            {league && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="bg-primary/90 text-primary-foreground text-xs">
                  {league.name}
                </Badge>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-1">
            <div className="font-semibold text-lg line-clamp-1">
              {title}
            </div>
            {score && (
              <div className="text-xl font-bold text-primary">
                {score}
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {(video.views_count || 0).toLocaleString()}
              </span>
              {video.published_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(video.published_at).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short"
                  })}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function LiveBanner({ stream }: { stream: any }) {
  if (!stream) return null;

  const match = stream.matches;
  const homeTeam = match?.home_team?.name || "Equipo A";
  const awayTeam = match?.away_team?.name || "Equipo B";

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
              <div className="text-sm opacity-80">{stream.leagues?.name || "Liga"}</div>
              <div className="font-semibold">{homeTeam} vs {awayTeam}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 text-white/80 text-sm">
              <Eye className="w-4 h-4" />
              {stream.current_viewers || 0}
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

function EmptyState() {
  return (
    <div className="text-center py-20 space-y-4">
      <Video className="w-16 h-16 mx-auto text-muted-foreground/50" />
      <h2 className="text-xl font-semibold">No hay videos todavía</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Pronto tendremos partidos, highlights y más contenido para ti.
      </p>
      <Link href="/play/admin">
        <Button variant="outline" className="mt-4">
          Subir primer video
        </Button>
      </Link>
    </div>
  );
}

export default async function PlayHomePage() {
  const [videos, liveStreams] = await Promise.all([
    getVideos(),
    getLiveStreams(),
  ]);

  const featuredVideo = videos[0];
  const recentVideos = videos.slice(1, 5);
  const liveStream = liveStreams[0];

  if (videos.length === 0 && liveStreams.length === 0) {
    return (
      <div className="container max-w-screen-2xl py-10">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="container max-w-screen-2xl py-10 space-y-12">
      {/* Live Banner */}
      {liveStream && <LiveBanner stream={liveStream} />}

      {/* Featured Match */}
      {featuredVideo && (
        <section>
          <Link href={`/play/watch/${featuredVideo.id}`}>
            <Card className="group overflow-hidden bg-card hover:bg-muted/30 transition-all duration-300 border-border/50 hover:border-primary/50">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted">
                    {featuredVideo.thumbnail_url ? (
                      <img
                        src={featuredVideo.thumbnail_url}
                        alt={featuredVideo.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="w-16 h-16 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <div className="w-20 h-20 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
                        <Play className="w-8 h-8 text-primary fill-current ml-1" />
                      </div>
                    </div>
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary text-primary-foreground">
                        Destacado
                      </Badge>
                    </div>
                    <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded bg-black/80 text-sm text-white font-medium">
                      {formatDuration(featuredVideo.duration_seconds)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-6 md:p-8 flex flex-col justify-center space-y-4">
                    <div className="space-y-2">
                      {featuredVideo.leagues && (
                        <Badge variant="outline" className="border-primary/50 text-primary">
                          {featuredVideo.leagues.name}
                        </Badge>
                      )}
                      <h2 className="text-2xl md:text-3xl font-bold">
                        {featuredVideo.matches
                          ? `${featuredVideo.matches.home_team?.name} vs ${featuredVideo.matches.away_team?.name}`
                          : featuredVideo.title}
                      </h2>
                    </div>
                    {(featuredVideo.home_score !== null || featuredVideo.matches) && (
                      <div className="text-4xl md:text-5xl font-bold text-primary">
                        {featuredVideo.home_score !== null
                          ? `${featuredVideo.home_score} - ${featuredVideo.away_score}`
                          : `${featuredVideo.matches?.home_score} - ${featuredVideo.matches?.away_score}`
                        }
                      </div>
                    )}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        {(featuredVideo.views_count || 0).toLocaleString()} vistas
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatDuration(featuredVideo.duration_seconds)}
                      </span>
                      {featuredVideo.published_at && (
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(featuredVideo.published_at).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>
      )}

      {/* Recent Videos */}
      {recentVideos.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Videos Recientes</h2>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Ver todos <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}

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
          <Link href="/play/admin">
            <Button className="bg-primary hover:bg-primary/90">
              Subir video
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
