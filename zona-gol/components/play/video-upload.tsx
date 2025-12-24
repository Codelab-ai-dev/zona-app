"use client";

import { useState, useCallback } from "react";
import { Upload, X, CheckCircle, Loader2, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VideoUploadProps {
  leagueId?: string;
  matchId?: string;
  tournamentId?: string;
  onUploadComplete?: (recording: any) => void;
}

type UploadStatus = "idle" | "preparing" | "uploading" | "processing" | "complete" | "error";

export function VideoUpload({
  leagueId,
  matchId,
  tournamentId,
  onUploadComplete,
}: VideoUploadProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar que sea video
      if (!file.type.startsWith("video/")) {
        setError("Por favor selecciona un archivo de video");
        return;
      }
      // Validar tamaño (max 5GB)
      if (file.size > 5 * 1024 * 1024 * 1024) {
        setError("El archivo es muy grande. Máximo 5GB.");
        return;
      }
      setSelectedFile(file);
      setError(null);
      // Auto-generar título si está vacío
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  }, [title]);

  const handleUpload = async () => {
    if (!selectedFile || !title) {
      setError("Selecciona un archivo y escribe un título");
      return;
    }

    try {
      setStatus("preparing");
      setProgress(0);

      // 1. Obtener URL de upload de Mux
      const response = await fetch("/api/play/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          match_id: matchId,
          league_id: leagueId,
          tournament_id: tournamentId,
          source_type: "manual",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al preparar upload");
      }

      const { recording, upload } = await response.json();

      setStatus("uploading");

      // 2. Subir video directamente a Mux
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          setStatus("processing");
          setProgress(100);
          // El webhook de Mux actualizará el status cuando esté listo
          onUploadComplete?.(recording);
        } else {
          throw new Error("Error al subir video");
        }
      };

      xhr.onerror = () => {
        setStatus("error");
        setError("Error de red al subir el video");
      };

      xhr.open("PUT", upload.url);
      xhr.setRequestHeader("Content-Type", selectedFile.type);
      xhr.send(selectedFile);

    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const resetForm = () => {
    setStatus("idle");
    setProgress(0);
    setError(null);
    setTitle("");
    setDescription("");
    setSelectedFile(null);
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Film className="w-5 h-5" />
          Subir Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "idle" && (
          <>
            {/* File Input */}
            <div className="space-y-2">
              <Label htmlFor="video">Video</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="video" className="cursor-pointer">
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click para seleccionar video
                      </p>
                      <p className="text-xs text-muted-foreground">
                        MP4, MOV, MKV • Máx 5GB
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Liga Premier - Jornada 15"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el partido..."
                rows={3}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !title}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Subir Video
            </Button>
          </>
        )}

        {(status === "preparing" || status === "uploading") && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>
                {status === "preparing" ? "Preparando..." : "Subiendo video..."}
              </span>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground">
              {progress}% completado
            </p>
          </div>
        )}

        {status === "processing" && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <div>
              <p className="font-medium">Procesando video</p>
              <p className="text-sm text-muted-foreground">
                Esto puede tomar unos minutos...
              </p>
            </div>
          </div>
        )}

        {status === "complete" && (
          <div className="space-y-4 py-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
            <div>
              <p className="font-medium">¡Video subido!</p>
              <p className="text-sm text-muted-foreground">
                El video está siendo procesado
              </p>
            </div>
            <Button variant="outline" onClick={resetForm}>
              Subir otro video
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 py-8 text-center">
            <X className="w-12 h-12 mx-auto text-destructive" />
            <div>
              <p className="font-medium text-destructive">Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={resetForm}>
              Intentar de nuevo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
