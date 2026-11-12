import { Download, Plus, Share, Smartphone, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  prompt(): Promise<void>
}

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_FOR_MS = 3 * 24 * 60 * 60 * 1000

const isIOSSafari = () => {
  const ua = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(ua) && /safari/.test(ua) && !/crios|fxios|chrome|android/.test(ua)
}

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return Number.isFinite(at) && Date.now() - at < DISMISS_FOR_MS
  } catch {
    return false
  }
}

/** "Instalar Zona Gol" card, as in the original: Android prompt or iOS instructions. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOS, setShowIOS] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return
    if (isIOSSafari()) {
      const timer = setTimeout(() => setShowIOS(true), 3000)
      return () => clearTimeout(timer)
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setHidden(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    setHidden(true)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // storage unavailable (private mode): just hide for this visit
    }
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt().catch(() => undefined)
    setDeferred(null)
    setHidden(true)
  }

  if (hidden || (!deferred && !showIOS)) return null

  return (
    <div role="dialog" aria-labelledby="install-title" className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="border border-green-500/20 bg-slate-900/95 backdrop-blur shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-green-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 id="install-title" className="font-semibold text-sm text-white">Instalar Zona Gol</h2>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-white" onClick={dismiss} aria-label="Cerrar">
                <X className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
            {showIOS ? (
              <>
                <p className="text-xs text-gray-400 mt-2">Para instalar la app en tu iPhone:</p>
                <ol className="text-xs text-gray-400 mt-2 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-800 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>
                      Toca el botón <Share className="inline w-4 h-4 text-green-400" aria-label="compartir" /> de compartir
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-800 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>
                      Selecciona <Plus className="inline w-4 h-4" aria-hidden="true" /> "Agregar a Inicio"
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-800 flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Toca "Agregar"</span>
                  </li>
                </ol>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-400 mt-1">Instala la app para acceso rápido y uso sin conexión.</p>
                <Button size="sm" onClick={() => void install()} className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white">
                  <Download className="w-4 h-4 mr-1" aria-hidden="true" />
                  Instalar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
