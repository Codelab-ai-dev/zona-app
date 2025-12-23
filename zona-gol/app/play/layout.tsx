import type { Metadata } from "next";
import Link from "next/link";
import { Play, Home, Video, Tv, Search, User } from "lucide-react";

export const metadata: Metadata = {
  title: "Zona Play - Revive cada jugada",
  description: "Videos, highlights y transmisiones en vivo de tus ligas de fútbol amateur",
};

function PlayHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Logo */}
        <Link href="/play" className="flex items-center gap-2 mr-6">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <Play className="w-4 h-4 text-primary-foreground fill-current" />
          </div>
          <span className="font-bold text-lg hidden sm:inline-block">
            Zona <span className="text-primary">Play</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 flex-1">
          <Link
            href="/play"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Inicio</span>
          </Link>
          <Link
            href="/play/clips"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Clips</span>
          </Link>
          <Link
            href="/play/live"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
          >
            <Tv className="w-4 h-4" />
            <span className="hidden sm:inline">En Vivo</span>
            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            href="/play/search"
            className="flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Search className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function PlayFooter() {
  return (
    <footer className="border-t border-border/40 py-6 mt-auto">
      <div className="container max-w-screen-2xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-primary">
              <Play className="w-3 h-3 text-primary-foreground fill-current" />
            </div>
            <span>Zona Play</span>
            <span className="text-border">|</span>
            <span>Parte de Zona Gol</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Zona Gol
            </Link>
            <Link href="/play" className="hover:text-foreground transition-colors">
              Videos
            </Link>
            <Link href="/play/clips" className="hover:text-foreground transition-colors">
              Clips
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="zona-play min-h-screen flex flex-col bg-background text-foreground">
      <PlayHeader />
      <main className="flex-1">
        {children}
      </main>
      <PlayFooter />
    </div>
  );
}
