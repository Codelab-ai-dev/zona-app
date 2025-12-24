"use client";

import MuxPlayer from "@mux/mux-player-react";

interface VideoPlayerProps {
  playbackId: string;
  title?: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  startTime?: number;
  accentColor?: string;
  className?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export function VideoPlayer({
  playbackId,
  title,
  poster,
  autoPlay = false,
  muted = false,
  loop = false,
  startTime = 0,
  accentColor = "#8B5CF6", // Purple de zona-play
  className = "",
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause,
}: VideoPlayerProps) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      metadata={{
        video_title: title,
      }}
      streamType="on-demand"
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      startTime={startTime}
      poster={poster}
      accentColor={accentColor}
      className={className}
      style={{ width: "100%", aspectRatio: "16/9" }}
      onTimeUpdate={(e) => {
        const target = e.target as HTMLVideoElement;
        onTimeUpdate?.(target.currentTime);
      }}
      onEnded={onEnded}
      onPlay={onPlay}
      onPause={onPause}
    />
  );
}

// Player para clips cortos (vertical)
interface ClipPlayerProps {
  playbackId: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
}

export function ClipPlayer({
  playbackId,
  title,
  autoPlay = true,
  muted = true,
  loop = true,
  className = "",
}: ClipPlayerProps) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      metadata={{
        video_title: title,
      }}
      streamType="on-demand"
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      accentColor="#EC4899" // Pink para clips
      className={className}
      style={{ width: "100%", aspectRatio: "9/16", maxHeight: "100%" }}
    />
  );
}

// Player para live streams
interface LivePlayerProps {
  playbackId: string;
  title?: string;
  className?: string;
  onViewerCount?: (count: number) => void;
}

export function LivePlayer({
  playbackId,
  title,
  className = "",
}: LivePlayerProps) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      metadata={{
        video_title: title,
      }}
      streamType="live"
      autoPlay={true}
      muted={false}
      accentColor="#EF4444" // Red para live
      className={className}
      style={{ width: "100%", aspectRatio: "16/9" }}
    />
  );
}

// Thumbnail estático
interface VideoThumbnailProps {
  playbackId: string;
  time?: number;
  width?: number;
  alt?: string;
  className?: string;
}

export function VideoThumbnail({
  playbackId,
  time = 10,
  width = 640,
  alt = "Video thumbnail",
  className = "",
}: VideoThumbnailProps) {
  const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}&width=${width}`;

  return (
    <img
      src={thumbnailUrl}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}

// GIF animado del video
interface VideoGifProps {
  playbackId: string;
  start?: number;
  end?: number;
  width?: number;
  fps?: number;
  className?: string;
}

export function VideoGif({
  playbackId,
  start = 0,
  end = 5,
  width = 320,
  fps = 10,
  className = "",
}: VideoGifProps) {
  const gifUrl = `https://image.mux.com/${playbackId}/animated.gif?start=${start}&end=${end}&width=${width}&fps=${fps}`;

  return (
    <img
      src={gifUrl}
      alt="Video preview"
      className={className}
      loading="lazy"
    />
  );
}
