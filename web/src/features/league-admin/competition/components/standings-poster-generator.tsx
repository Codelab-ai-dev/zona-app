import { Download, ImageDown, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import type { Standings } from '../types'
import { StandingsPoster } from './standings-poster'

interface StandingsPosterGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  standings: Standings[]
  tournamentName: string
  leagueName: string
  leagueLogo?: string
}

export function StandingsPosterGenerator({ open, onOpenChange, standings, tournamentName, leagueName, leagueLogo }: StandingsPosterGeneratorProps) {
  const [downloading, setDownloading] = useState(false)
  const posterRef = useRef<HTMLDivElement>(null)
  const league = { name: leagueName, logo: leagueLogo }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const el = posterRef.current
      if (!el) throw new Error('Poster element not found')

      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1000px;height:5000px;border:none;'
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument as Document
      iframeDoc.open()
      iframeDoc.write(`<!DOCTYPE html><html><head><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{-webkit-font-smoothing:antialiased;}
table{border-collapse:collapse;border-spacing:0;}
td,th{vertical-align:middle;}
img{display:block;}
</style></head><body></body></html>`)
      iframeDoc.close()

      const clone = el.cloneNode(true) as HTMLDivElement
      iframeDoc.body.appendChild(clone)

      const imgs = clone.querySelectorAll('img')
      await Promise.all(Array.from(imgs).map(img =>
        img.complete ? Promise.resolve() : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res() })
      ))
      await new Promise(r => setTimeout(r, 300))

      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: 900,
        ...({ window: iframe.contentWindow } as Record<string, unknown>),
      })

      document.body.removeChild(iframe)

      const link = document.createElement('a')
      link.download = `posiciones-${tournamentName.replace(/\s+/g, '_')}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Imagen descargada exitosamente')
    } catch (error) {
      console.error('Error descargando poster:', error)
      toast.error('Error al descargar la imagen')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] flex flex-col backdrop-blur-xl bg-slate-900/95 border-white/10 text-white p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <ImageDown className="w-5 h-5" />
            Generar Imagen de Posiciones
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Vista previa de la tabla de posiciones
          </DialogDescription>
        </DialogHeader>

        {standings.length === 0 ? (
          <div className="text-center py-12 text-white/50 px-5">
            No hay datos de posiciones para generar imagen.
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-3">
              <div className="rounded-lg overflow-hidden border border-white/10" style={{ zoom: 0.58 }}>
                <StandingsPoster posterRef={posterRef} standings={standings} league={league} tournamentName={tournamentName} />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/10 shrink-0">
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-700 hover:to-amber-600 text-white font-bold border-0 shadow-lg"
                size="lg"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando imagen...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar PNG
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
