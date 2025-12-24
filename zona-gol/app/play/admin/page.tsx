"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Video,
  Upload,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VideoUpload } from "@/components/play/video-upload";

interface Recording {
  id: string;
  title: string;
  description: string | null;
  status: string;
  visibility: string;
  duration_seconds: number | null;
  views_count: number;
  mux_playback_id: string | null;
  thumbnail_url: string | null;
  created_at: string;
  published_at: string | null;
}

const statusConfig = {
  pending: { label: "Pendiente", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  uploading: { label: "Subiendo", color: "bg-blue-500/20 text-blue-400", icon: Loader2 },
  processing: { label: "Procesando", color: "bg-purple-500/20 text-purple-400", icon: Loader2 },
  ready: { label: "Listo", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  failed: { label: "Error", color: "bg-red-500/20 text-red-400", icon: XCircle },
};

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

export default function PlayAdminPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("videos");

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/play/videos?limit=50&status=all");
      if (response.ok) {
        const data = await response.json();
        setRecordings(data.videos || []);
      }
    } catch (error) {
      console.error("Error fetching recordings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/play/videos/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setRecordings(recordings.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error("Error deleting recording:", error);
    }
  };

  const handleUploadComplete = (recording: Recording) => {
    setRecordings([recording, ...recordings]);
    setActiveTab("videos");
  };

  return (
    <div className="container max-w-screen-xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/play">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Admin - Zona Play</h1>
            <p className="text-muted-foreground">Gestiona videos y contenido</p>
          </div>
        </div>
        <Button onClick={fetchRecordings} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{recordings.length}</div>
                <div className="text-sm text-muted-foreground">Videos</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {recordings.filter((r) => r.status === "ready").length}
                </div>
                <div className="text-sm text-muted-foreground">Publicados</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Loader2 className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {recordings.filter((r) => r.status === "processing").length}
                </div>
                <div className="text-sm text-muted-foreground">Procesando</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {recordings.reduce((acc, r) => acc + (r.views_count || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Vistas totales</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Subir Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Videos Subidos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : recordings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay videos todavía</p>
                  <Button
                    variant="link"
                    onClick={() => setActiveTab("upload")}
                    className="mt-2"
                  >
                    Sube tu primer video
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Video</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Vistas</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordings.map((recording) => {
                      const status = statusConfig[recording.status as keyof typeof statusConfig] || statusConfig.pending;
                      const StatusIcon = status.icon;

                      return (
                        <TableRow key={recording.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                                {recording.thumbnail_url ? (
                                  <img
                                    src={recording.thumbnail_url}
                                    alt={recording.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Video className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium truncate max-w-[200px]">
                                  {recording.title}
                                </div>
                                {recording.description && (
                                  <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                    {recording.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={status.color}>
                              <StatusIcon className={`w-3 h-3 mr-1 ${status.icon === Loader2 ? "animate-spin" : ""}`} />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDuration(recording.duration_seconds)}</TableCell>
                          <TableCell>{recording.views_count}</TableCell>
                          <TableCell>
                            {new Date(recording.created_at).toLocaleDateString("es-MX", {
                              day: "numeric",
                              month: "short",
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(recording.status === "uploading" || recording.status === "processing") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/play/videos/${recording.id}/refresh`, {
                                        method: "POST",
                                      });
                                      const data = await res.json();
                                      if (data.recording) {
                                        setRecordings(recordings.map(r =>
                                          r.id === recording.id ? data.recording : r
                                        ));
                                      }
                                      alert(data.message || "Status checked");
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }}
                                  title="Verificar estado en Mux"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              )}
                              {recording.status === "ready" && recording.mux_playback_id && (
                                <Link href={`/play/watch/${recording.id}`} target="_blank">
                                  <Button variant="ghost" size="icon">
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </Link>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar video?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. El video será eliminado permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(recording.id)}
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <div className="flex justify-center">
            <VideoUpload onUploadComplete={handleUploadComplete} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
