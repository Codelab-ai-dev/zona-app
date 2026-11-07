import { useMemo, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, Printer, IdCard } from 'lucide-react'
import { toast } from 'sonner'

import type { Player } from '../types'
import { buildPlayerQrPayload } from './credential-qr'
import { buildCredentialPrintHtml, getPlayerInitials } from './credential-print'

interface PlayerCredentialProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  player: Player
  teamName: string
  teamLogo?: string
  leagueId?: string
}

export function PlayerCredential({ open, onOpenChange, player, teamName, teamLogo, leagueId }: PlayerCredentialProps) {
  const [printing, setPrinting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  // Computed once per player so the QR does not change on every render.
  const qrData = useMemo(
    () => buildPlayerQrPayload(player, { leagueId }),
    [player, leagueId],
  )

  const handlePrint = () => {
    setPrinting(true)
    try {
      const qrElement = qrRef.current?.querySelector('svg')
      if (!qrElement) throw new Error('QR no encontrado')
      const printWindow = window.open('', '_blank')
      if (!printWindow) throw new Error('No se pudo abrir ventana de impresión')

      printWindow.document.write(
        buildCredentialPrintHtml({
          player,
          teamName,
          teamLogo,
          qrSvg: new XMLSerializer().serializeToString(qrElement),
        }),
      )
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
        printWindow.close()
        setPrinting(false)
      }
    } catch (error) {
      console.error('Error imprimiendo credencial:', error)
      toast.error('Error al imprimir la credencial')
      setPrinting(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      if (!cardRef.current) throw new Error('Elemento de credencial no encontrado')
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 4,
        useCORS: true,
        allowTaint: true,
        width: 320,
        height: 200,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 320,
        windowHeight: 200,
      })

      const link = document.createElement('a')
      link.download = `credencial-${player.name.replace(/\s+/g, '_')}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Credencial descargada exitosamente')
    } catch (error) {
      console.error('Error descargando credencial:', error)
      toast.error('Error al descargar la credencial')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IdCard className="w-5 h-5" aria-hidden="true" />
            Credencial de Jugador
          </DialogTitle>
          <DialogDescription>Credencial imprimible para {player.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-center p-4 sm:p-6">
            <div
              ref={cardRef}
              data-testid="credential-card"
              className="border-2 border-blue-600 rounded-lg p-4 bg-gradient-to-br from-slate-50 to-slate-200"
              style={{ width: '320px', height: '220px' }}
            >
              <div className="text-center mb-2">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {teamLogo && (
                    <img
                      src={teamLogo}
                      alt={`Logo ${teamName}`}
                      className="w-4 h-4 object-contain"
                      crossOrigin="anonymous"
                    />
                  )}
                  <h3 className="text-xs font-bold text-blue-600 m-0">{teamName.toUpperCase()}</h3>
                </div>
              </div>

              <div className="flex items-center gap-3 min-h-24 flex-1">
                <div className="flex-shrink-0">
                  <div className="w-16 h-20 bg-white border-2 border-slate-300 rounded-md overflow-hidden">
                    {player.photo ? (
                      <img
                        src={player.photo}
                        alt={player.name}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-500">{getPlayerInitials(player.name)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="text-sm sm:text-base font-bold text-slate-800 m-0 mb-1 leading-tight truncate">
                    {player.name}
                  </h4>
                  <p className="text-sm text-slate-600 m-0 mb-3 truncate font-medium">{player.position}</p>
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-white border-3 border-blue-600 rounded-full self-start">
                    <span className="text-base sm:text-lg font-bold text-blue-600">{player.jersey_number}</span>
                  </div>
                </div>

                <div ref={qrRef} className="flex-shrink-0 bg-white p-2 rounded-md border-2 border-slate-300">
                  <QRCode value={qrData} size={86} level="M" fgColor="#000000" bgColor="#ffffff" />
                </div>
              </div>

              <div className="text-center mt-1">
                <p className="text-sm text-slate-600 m-0 font-medium">ID: {player.id.slice(-8).toUpperCase()}</p>
                <p className="text-sm text-blue-600 m-0 font-bold tracking-wide">CREDENCIAL OFICIAL</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <section aria-labelledby="credential-player-info">
              <h4 id="credential-player-info" className="font-semibold mb-2">
                Información del Jugador
              </h4>
              <dl className="space-y-1 text-sm">
                <Row term="Nombre" value={player.name} />
                <Row term="Posición" value={player.position} />
                <Row term="Número" value={`#${player.jersey_number}`} />
                <Row term="Equipo" value={teamName} />
              </dl>
            </section>
            <section aria-labelledby="credential-specs">
              <h4 id="credential-specs" className="font-semibold mb-2">
                Especificaciones
              </h4>
              <dl className="space-y-1 text-sm">
                <Row term="Tamaño" value="85.6 x 53.98 mm" />
                <Row term="Formato" value="Tarjeta estándar" />
                <Row term="QR" value="Código de identificación" />
                <Row term="Logo" value={teamLogo ? 'Incluido' : 'No disponible'} />
              </dl>
            </section>
          </div>

          <div className="flex gap-3">
            <Button onClick={handlePrint} disabled={printing} className="flex-1">
              <Printer className="w-4 h-4 mr-2" aria-hidden="true" />
              {printing ? 'Imprimiendo...' : 'Imprimir'}
            </Button>
            <Button onClick={() => void handleDownload()} disabled={downloading} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" aria-hidden="true" />
              {downloading ? 'Descargando...' : 'Descargar PNG'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex gap-1">
      <dt className="text-muted-foreground">{term}:</dt>
      <dd>{value}</dd>
    </div>
  )
}
