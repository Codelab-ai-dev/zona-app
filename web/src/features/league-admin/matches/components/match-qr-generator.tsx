import { useState } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, QrCode } from 'lucide-react'
import QRCode from 'react-qr-code'
import { toast } from 'sonner'

import { useMatchById } from '../api'
import type { MatchWithRelations } from '../types'

interface MatchQRGeneratorProps {
  match: MatchWithRelations
  tournamentName: string
  leagueSlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MatchQRGenerator({ match, tournamentName, leagueSlug, open, onOpenChange }: MatchQRGeneratorProps) {
  const { data: fullMatch } = useMatchById(match.id)
  const displayMatch = fullMatch || match
  // Fixed for the lifetime of the dialog so the QR does not change on every re-render.
  const [issuedAt] = useState(() => new Date().toISOString())

  // Generate QR payload matching legacy Flutter app: includes tournament name and league_slug for scanner
  const qrPayload = {
    type: 'zona_gol_match',
    version: '1.0',
    match_id: displayMatch.id,
    match_info: {
      home_team: displayMatch.home_team_name,
      away_team: displayMatch.away_team_name,
      date: displayMatch.match_date.split('T')[0],
      time: displayMatch.match_time || '00:00',
      tournament: tournamentName,
      league_slug: leagueSlug,
    },
    timestamp: issuedAt,
  }

  const qrData = JSON.stringify(qrPayload)

  const handleDownload = async () => {
    try {
      const qrElement = document.getElementById('qr-code-svg')
      if (!qrElement) {
        toast.error('Error: elemento QR no encontrado')
        return
      }

      const svgData = new XMLSerializer().serializeToString(qrElement.querySelector('svg')!)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      const link = document.createElement('a')
      link.href = url
      link.download = `qr-${displayMatch.home_team_name || 'home'}-vs-${displayMatch.away_team_name || 'away'}.svg`
      link.click()

      URL.revokeObjectURL(url)
      toast.success('QR descargado exitosamente')
    } catch (error) {
      console.error('Error descargando QR:', error)
      toast.error('Error al descargar QR')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5" aria-hidden="true" />
            Código QR del Partido
          </DialogTitle>
          <DialogDescription>
            {displayMatch.home_team_name} vs {displayMatch.away_team_name}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <div id="qr-code-svg">
              <QRCode size={256} value={qrData} />
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {displayMatch.home_team_name} vs {displayMatch.away_team_name}
              </p>
              <p className="text-xs">
                {displayMatch.match_date.split('T')[0]} • {displayMatch.match_time || '--:--'}
              </p>
            </div>

            <Button onClick={handleDownload} className="w-full">
              <Download className="size-4 mr-2" aria-hidden="true" />
              Descargar QR
            </Button>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
