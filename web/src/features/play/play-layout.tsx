import { Home, Search, Tv, User, Video } from 'lucide-react'
import { Link, Outlet } from 'react-router'

const navLink =
  'flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted'
const iconLink =
  'flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'

function PlayHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-28 max-w-screen-2xl items-center px-6 lg:px-10">
        <Link to="/play" className="flex items-center mr-8">
          <img src="/zona-play-logo.png" alt="Zona Play" width={300} height={300} className="h-24 sm:h-28 w-auto" />
        </Link>

        <nav aria-label="Zona Play" className="flex items-center gap-1 flex-1">
          <Link to="/play" className={navLink}>
            <Home className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Inicio</span>
          </Link>
          <Link to="/play/clips" className={navLink}>
            <Video className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Clips</span>
          </Link>
          {/* There is no live index page; the live banner on the home links to each stream. */}
          <Link to="/play" className={navLink}>
            <Tv className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">En Vivo</span>
            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/play/search" className={iconLink} aria-label="Buscar">
            <Search className="w-5 h-5" aria-hidden="true" />
          </Link>
          <Link to="/login" className={iconLink} aria-label="Iniciar sesión">
            <User className="w-5 h-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  )
}

function PlayFooter() {
  return (
    <footer className="border-t border-border/40 py-8 mt-auto">
      <div className="container mx-auto max-w-screen-2xl px-6 lg:px-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <img src="/zona-play-logo.png" alt="Zona Play" width={200} height={200} className="h-20 w-auto opacity-90" />
            <span className="text-border">|</span>
            <span>Parte de Zona Gol</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Zona Gol</Link>
            <Link to="/play" className="hover:text-foreground transition-colors">Videos</Link>
            <Link to="/play/clips" className="hover:text-foreground transition-colors">Clips</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

/** Purple streaming shell shared by every public Zona Play page (original app/play/layout.tsx). */
export function PlayLayout() {
  return (
    <div className="zona-play min-h-screen flex flex-col bg-background text-foreground">
      <PlayHeader />
      <main className="flex-1 px-6 lg:px-10">
        <Outlet />
      </main>
      <PlayFooter />
    </div>
  )
}
