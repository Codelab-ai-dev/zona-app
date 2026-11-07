import { useState, useRef } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Standings } from '../types'

interface StandingsPosterGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  standings: Standings[]
  tournamentName: string
  leagueName: string
}

export function StandingsPosterGenerator({
  open,
  onOpenChange,
  standings,
  tournamentName,
  leagueName,
}: StandingsPosterGeneratorProps) {
  const [downloading, setDownloading] = useState(false)
  const posterRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const el = posterRef.current
      if (!el) throw new Error('Poster element not found')

      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default

      // Create canvas from the poster element
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 1080,
        height: el.scrollHeight,
      })

      // Download the image
      const link = document.createElement('a')
      link.download = `posiciones-${tournamentName.replace(/\s+/g, '_')}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Poster descargado exitosamente')
      onOpenChange(false)
    } catch (error) {
      console.error('Error downloading poster:', error)
      toast.error('Error al descargar el poster')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Descargar Poster de Posiciones</DialogTitle>
          <DialogDescription>{tournamentName}</DialogDescription>
        </DialogHeader>

        <div ref={posterRef} className="w-full bg-white p-8 space-y-6">
          {/* Header */}
          <div className="text-center border-b-2 pb-4">
            <h1 className="text-3xl font-bold">{leagueName}</h1>
            <h2 className="text-xl font-semibold text-muted-foreground">{tournamentName}</h2>
            <p className="text-sm text-muted-foreground">Tabla de Posiciones</p>
          </div>

          {/* Standings Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 text-center font-bold">Pos.</th>
                  <th className="border p-2 text-left font-bold">Equipo</th>
                  <th className="border p-2 text-center font-bold">PJ</th>
                  <th className="border p-2 text-center font-bold">G</th>
                  <th className="border p-2 text-center font-bold">E</th>
                  <th className="border p-2 text-center font-bold">P</th>
                  <th className="border p-2 text-center font-bold">GF</th>
                  <th className="border p-2 text-center font-bold">GC</th>
                  <th className="border p-2 text-center font-bold">DG</th>
                  <th className="border p-2 text-center font-bold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((standing, idx) => (
                  <tr key={standing.team_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border p-2 text-center font-medium">{standing.position}</td>
                    <td className="border p-2 font-medium">{standing.team_name}</td>
                    <td className="border p-2 text-center">{standing.matches_played}</td>
                    <td className="border p-2 text-center">{standing.matches_won}</td>
                    <td className="border p-2 text-center">{standing.matches_drawn}</td>
                    <td className="border p-2 text-center">{standing.matches_lost}</td>
                    <td className="border p-2 text-center">{standing.goals_for}</td>
                    <td className="border p-2 text-center">{standing.goals_against}</td>
                    <td className="border p-2 text-center">{standing.goal_difference}</td>
                    <td className="border p-2 text-center font-bold">
                      {standing.points}
                      {standing.points_adjustment !== 0 && (
                        <div className="text-xs text-muted-foreground">
                          ({standing.points_adjustment > 0 ? '+' : ''}{standing.points_adjustment})
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground border-t-2 pt-4">
            <p>Generado el {new Date().toLocaleDateString('es-MX')}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={downloading}>
            Cancelar
          </Button>
          <Button onClick={handleDownload} disabled={downloading} className="gap-2">
            {downloading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Descargando…
              </>
            ) : (
              <>
                <Download className="size-4" />
                Descargar Poster
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
