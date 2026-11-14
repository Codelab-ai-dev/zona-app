import { useRef, useState, useMemo } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import type { MatchWithRelations } from '../types'
import { PosterCanvas } from './poster-canvas'

/**
 * The preview shrinks the poster with CSS `zoom` inside a dialog centered with
 * `transform`. html2canvas measures with getBoundingClientRect, which both
 * distort, so the PNG came out squashed. Undo them on the cloned document.
 */
function unscalePreview(clone: HTMLElement) {
  for (let node = clone.parentElement; node; node = node.parentElement) {
    node.style.zoom = '1'
    node.style.transform = 'none'
  }
}

interface MatchPosterGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  matches: MatchWithRelations[]
  tournamentName: string
  /** Pre-selects this round when the dialog opens. */
  initialRound?: number
}

export function MatchPosterGenerator({ open, onOpenChange, matches, tournamentName, initialRound }: MatchPosterGeneratorProps) {
  const [downloading, setDownloading] = useState(false)
  const [selectedRound, setSelectedRound] = useState<string>(initialRound === undefined ? 'all' : String(initialRound))
  const posterRef = useRef<HTMLDivElement>(null)

  const scheduledMatches = matches.filter((m) => m.status === 'scheduled')

  const availableRounds = useMemo(() => {
    return Array.from(new Set(scheduledMatches.map((m) => m.round).filter((r): r is number => r !== undefined))).sort(
      (a, b) => a - b
    )
  }, [scheduledMatches])

  const filteredMatches = useMemo(() => {
    if (selectedRound === 'all') return scheduledMatches
    return scheduledMatches.filter((m) => m.round === Number(selectedRound))
  }, [scheduledMatches, selectedRound])

  const matchesByDate = filteredMatches.reduce<Record<string, MatchWithRelations[]>>((acc, match) => {
    const dateKey = match.match_date.split('T')[0] ?? ''
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey]!.push(match)
    return acc
  }, {})

  const sortedDates = Object.keys(matchesByDate).sort()
  const posterTitle = selectedRound === 'all' ? 'PRÓXIMOS PARTIDOS' : `JORNADA ${selectedRound}`

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const el = posterRef.current
      if (!el) throw new Error('Poster element not found')

      const html2canvas = (await import('html2canvas-pro')).default

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: 900,
        onclone: (_doc, clone) => unscalePreview(clone),
      })

      const link = document.createElement('a')
      const suffix = selectedRound === 'all' ? 'todos' : `jornada-${selectedRound}`
      link.download = `partidos-${tournamentName.replace(/\s+/g, '_')}-${suffix}.png`
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

  const posterContent = (
    <PosterCanvas
      posterRef={posterRef}
      title={posterTitle}
      tournamentName={tournamentName}
      matchesByDate={matchesByDate}
      sortedDates={sortedDates}
    />
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageDown className="size-5" aria-hidden="true" />
            Generar Imagen de Partidos
          </DialogTitle>
          <DialogDescription>Selecciona la jornada y descarga el poster</DialogDescription>
        </DialogHeader>

        {scheduledMatches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No hay partidos programados para generar imagen.</div>
        ) : (
          <>
            <div className="flex items-center gap-3 pb-3">
              <Select value={selectedRound} onValueChange={setSelectedRound}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Seleccionar jornada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las jornadas</SelectItem>
                  {availableRounds.map((round) => (
                    <SelectItem key={round} value={String(round)}>
                      Jornada {round}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary">
                {filteredMatches.length} {filteredMatches.length === 1 ? 'partido' : 'partidos'}
              </Badge>
            </div>

            {filteredMatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No hay partidos programados en esta jornada.</div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto pb-3 border rounded-lg" style={{ zoom: 0.58 }}>
                  {posterContent}
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={handleDownload} disabled={downloading} className="w-full" size="lg">
                    {downloading ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />
                        Generando imagen...
                      </>
                    ) : (
                      <>
                        <ImageDown className="size-4 mr-2" aria-hidden="true" />
                        Descargar PNG
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
