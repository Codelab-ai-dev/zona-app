"use client"

import { useState, useEffect } from "react"
import { Download, X, Smartphone, Share, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

// Detectar si es iOS
function isIOS(): boolean {
  if (typeof window === "undefined") return false
  const userAgent = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

// Detectar si es Safari
function isSafari(): boolean {
  if (typeof window === "undefined") return false
  const userAgent = window.navigator.userAgent.toLowerCase()
  return /safari/.test(userAgent) && !/chrome/.test(userAgent) && !/android/.test(userAgent)
}

// Detectar si ya está instalada como PWA
function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  )
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (isStandalone()) {
      setIsInstalled(true)
      return
    }

    // Check localStorage for dismissed prompt
    const dismissed = localStorage.getItem("pwa-install-dismissed")
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
      if (dismissedTime > threeDaysAgo) {
        return // Don't show for 3 days after dismissal
      }
    }

    // iOS/Safari: Show manual instructions
    if (isIOS() && isSafari()) {
      // Delay showing to not be annoying on first visit
      const timer = setTimeout(() => {
        setShowIOSPrompt(true)
      }, 3000)
      return () => clearTimeout(timer)
    }

    // Android/Chrome: Use beforeinstallprompt
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setShowIOSPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        setIsInstalled(true)
      }
    } catch (error) {
      console.error("Error installing PWA:", error)
    }

    setShowPrompt(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setShowIOSPrompt(false)
    localStorage.setItem("pwa-install-dismissed", Date.now().toString())
  }

  // No mostrar si ya está instalada
  if (isInstalled) {
    return null
  }

  // Prompt para iOS/Safari
  if (showIOSPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
        <Card className="border-primary/20 bg-background/95 backdrop-blur shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Instalar Zona Gol</h3>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleDismiss}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Para instalar la app en tu iPhone:
                </p>
                <ol className="text-xs text-muted-foreground mt-2 space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-muted rounded flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Toca el boton <Share className="inline w-4 h-4 text-primary" /> de compartir</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-muted rounded flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Selecciona <Plus className="inline w-4 h-4" /> "Agregar a Inicio"</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-muted rounded flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Toca "Agregar"</span>
                  </li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Prompt para Android/Chrome
  if (showPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
        <Card className="border-primary/20 bg-background/95 backdrop-blur shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">Instalar Zona Gol</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Instala la app para acceso rapido y uso offline.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleInstall} className="flex-1">
                    <Download className="w-4 h-4 mr-1" />
                    Instalar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismiss}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
