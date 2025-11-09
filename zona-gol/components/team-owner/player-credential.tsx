"use client"

import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Download, Printer, IdCard, QrCode as QrCodeIcon } from "lucide-react"
import { toast } from "sonner"

interface Player {
  id: string
  name: string
  jersey_number: number
  position: string
  photo?: string | null
  team_id: string
}

interface Team {
  name: string
  logo?: string | null
  leagueLogo?: string | null
}

interface PlayerCredentialProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  player: Player
  team: Team
  qrData: string
}

export function PlayerCredential({
  open,
  onOpenChange,
  player,
  team,
  qrData
}: PlayerCredentialProps) {
  const [printing, setPrinting] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const printContent = document.getElementById('credential-content')
      if (!printContent) {
        throw new Error('Contenido de credencial no encontrado')
      }

      // Generar QR como imagen base64 para mejor compatibilidad en impresión
      let qrHTML = ''
      try {
        const qrElement = printContent.querySelector('svg')
        if (qrElement) {
          // Crear canvas temporal para convertir SVG a imagen
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          const img = new Image()

          canvas.width = 150
          canvas.height = 150

          const svgData = new XMLSerializer().serializeToString(qrElement)
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
          const url = URL.createObjectURL(svgBlob)

          await new Promise((resolve, reject) => {
            img.onload = () => {
              if (!ctx) {
                URL.revokeObjectURL(url)
                reject(new Error('No se pudo obtener contexto del canvas'))
                return
              }
              
              ctx.fillStyle = 'white'
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

              const qrBase64 = canvas.toDataURL('image/png')
              qrHTML = `<img src="${qrBase64}" width="82" height="82" style="border: none;" alt="QR Code" />`
              URL.revokeObjectURL(url)
              resolve(null)
            }

            img.onerror = () => {
              URL.revokeObjectURL(url)
              reject(new Error('Error al procesar QR'))
            }

            img.src = url
          })
        } else {
          throw new Error('QR element not found')
        }
      } catch (error) {
        console.warn('Error generando QR para impresión:', error)
        qrHTML = `
          <div style="width: 82px; height: 82px; border: 2px solid #ccc; display: flex; align-items: center; justify-content: center; background: white; font-size: 12px; font-weight: bold;">
            QR
          </div>
        `
      }

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('No se pudo abrir ventana de impresión')
      }

      const photoHTML = player.photo
        ? `<img src="${player.photo}" alt="${player.name}" crossorigin="anonymous" />`
        : `<div class="player-photo-placeholder">${getPlayerInitials(player.name)}</div>`

      const teamLogoHTML = team.logo
        ? `<img src="${team.logo}" alt="Logo ${team.name}" class="team-logo" crossorigin="anonymous" />`
        : ''

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Credencial - ${player.name}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                background: white;
              }
              .credential {
                width: 85.6mm;
                height: 53.98mm;
                border: 2px solid #0066cc;
                border-radius: 8px;
                padding: 8px;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                position: relative;
                overflow: hidden;
              }
              ${team.leagueLogo ? `
              .credential::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 120px;
                height: 120px;
                background-image: url('${team.leagueLogo}');
                background-size: contain;
                background-position: center;
                background-repeat: no-repeat;
                opacity: 0.08;
                z-index: 0;
                pointer-events: none;
              }
              .credential > * {
                position: relative;
                z-index: 1;
              }
              ` : ''}
              .header {
                text-align: center;
                margin-bottom: 4px;
              }
              .team-header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                margin-bottom: 2px;
              }
              .team-logo {
                width: 24px;
                height: 24px;
                object-fit: contain;
              }
              .team-name {
                font-size: 14px;
                font-weight: bold;
                color: #0066cc;
                margin: 0;
                line-height: 1;
              }
              .content {
                display: flex;
                align-items: center;
                gap: 6px;
                flex: 1;
                min-height: 90px;
              }
              .player-photo {
                flex-shrink: 0;
                width: 60px;
                height: 75px;
                background: white;
                border: 2px solid #cbd5e1;
                border-radius: 6px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .player-photo img {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }
              .player-photo-placeholder {
                width: 100%;
                height: 100%;
                background: #f1f5f9;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                color: #64748b;
              }
              .player-info {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
                height: 100%;
              }
              .player-name {
                font-size: 16px;
                font-weight: bold;
                color: #1e293b;
                margin: 0 0 4px 0;
                line-height: 1.1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .player-position {
                font-size: 12px;
                color: #64748b;
                margin: 0 0 8px 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-weight: 500;
              }
              .jersey-number {
                font-size: 20px;
                font-weight: bold;
                color: #0066cc;
                background: white;
                border: 3px solid #0066cc;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
                align-self: flex-start;
              }
              .qr-container {
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: white;
                border-radius: 6px;
                padding: 4px;
                border: 2px solid #e2e8f0;
                width: 90px;
                height: 90px;
              }
              .footer {
                text-align: center;
                margin-top: 4px;
              }
              .credential-id {
                font-size: 8px;
                color: #64748b;
                margin: 0;
                font-weight: 500;
              }
              .valid-text {
                font-size: 9px;
                color: #0066cc;
                margin: 1px 0 0 0;
                font-weight: bold;
                letter-spacing: 0.5px;
              }
              @media print {
                body { margin: 0; padding: 10px; }
                .credential { margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="credential">
              <div class="header">
                <div class="team-header">
                  ${teamLogoHTML}
                  <h3 class="team-name">${team.name.toUpperCase()}</h3>
                </div>
              </div>
              <div class="content">
                <div class="player-photo">
                  ${photoHTML}
                </div>
                <div class="player-info">
                  <h4 class="player-name">${player.name}</h4>
                  <p class="player-position">${player.position}</p>
                  <div class="jersey-number">${player.jersey_number}</div>
                </div>
                <div class="qr-container">
                  ${qrHTML}
                </div>
              </div>
              <div class="footer">
                <p class="credential-id">ID: ${player.id.slice(-8).toUpperCase()}</p>
                <p class="valid-text">CREDENCIAL OFICIAL</p>
              </div>
            </div>
          </body>
        </html>
      `)

      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
        printWindow.close()
        setPrinting(false)
      }
    } catch (error) {
      console.error('Error imprimiendo credencial:', error)
      setPrinting(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const credentialElement = document.getElementById('credential-content')
      if (!credentialElement) {
        throw new Error('Elemento de credencial no encontrado')
      }

      // Importar html2canvas dinámicamente
      const html2canvas = (await import('html2canvas')).default

      const canvas = await html2canvas(credentialElement, {
        backgroundColor: '#ffffff',
        scale: 4,
        useCORS: true,
        allowTaint: true,
        width: 320,
        height: 200,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 320,
        windowHeight: 200
      })

      // Crear enlace de descarga
      const link = document.createElement('a')
      link.download = `credencial-${player.name.replace(/\s+/g, '_')}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png', 1.0)

      // Simular click para descargar
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Credencial descargada exitosamente')
      setDownloading(false)
    } catch (error) {
      console.error('Error descargando credencial:', error)
      toast.error('Error al descargar la credencial. Por favor intenta de nuevo.')
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl backdrop-blur-xl bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-900/95 border-white/20 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <IdCard className="w-5 h-5 text-green-300" />
            Credencial de Jugador
          </DialogTitle>
          <DialogDescription className="text-white/80 drop-shadow">
            Credencial imprimible para {player.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vista previa de la credencial */}
          <div className="flex justify-center p-6 backdrop-blur-md bg-white/10 rounded-xl border border-white/20">
            <div
              id="credential-content"
              className="border-2 border-blue-600 rounded-lg p-4 bg-gradient-to-br from-slate-50 to-slate-200 shadow-lg relative overflow-hidden"
              style={{
                width: '320px',
                height: '220px'
              }}
            >
              {/* Marca de agua con logo de la liga */}
              {team.leagueLogo && (
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    width: '120px',
                    height: '120px',
                    opacity: 0.08,
                    zIndex: 0
                  }}
                >
                  <img
                    src={team.leagueLogo}
                    alt="Liga"
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
              )}
              {/* Header */}
              <div className="text-center mb-2 relative z-10">
                <div className="flex items-center justify-center gap-1 mb-1">
                  {team.logo && (
                    <img
                      src={team.logo}
                      alt={`Logo ${team.name}`}
                      className="w-4 h-4 object-contain"
                      crossOrigin="anonymous"
                    />
                  )}
                  <h3 className="text-xs font-bold text-blue-600 m-0">
                    {team.name.toUpperCase()}
                  </h3>
                </div>
              </div>

              {/* Contenido principal */}
              <div className="flex items-center gap-3 min-h-24 flex-1 relative z-10">
                {/* Foto del jugador */}
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
                        <span className="text-xs font-bold text-slate-500">
                          {getPlayerInitials(player.name)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información del jugador */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="text-lg font-bold text-slate-800 m-0 mb-2 leading-tight truncate">
                    {player.name}
                  </h4>
                  <p className="text-sm text-slate-600 m-0 mb-3 truncate font-medium">
                    {player.position}
                  </p>

                  {/* Número de camiseta */}
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-white border-3 border-blue-600 rounded-full self-start">
                    <span className="text-lg font-bold text-blue-600">
                      {player.jersey_number}
                    </span>
                  </div>
                </div>

                {/* Código QR */}
                <div className="flex-shrink-0 bg-white p-2 rounded-md border-2 border-slate-300">
                  <QRCode
                    value={qrData}
                    size={86}
                    level="M"
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-1 relative z-10">
                <p className="text-sm text-slate-600 m-0 font-medium">
                  ID: {player.id.slice(-8).toUpperCase()}
                </p>
                <p className="text-sm text-blue-600 m-0 font-bold tracking-wide">
                  CREDENCIAL OFICIAL
                </p>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="grid grid-cols-2 gap-4 p-4 backdrop-blur-md bg-blue-500/20 rounded-xl border border-blue-300/30 shadow-lg">
            <div>
              <h4 className="font-semibold text-white mb-2 drop-shadow-lg">Información del Jugador</h4>
              <div className="space-y-1 text-sm">
                <div className="text-white/90 drop-shadow"><span className="text-white/70">Nombre:</span> {player.name}</div>
                <div className="text-white/90 drop-shadow"><span className="text-white/70">Posición:</span> {player.position}</div>
                <div className="text-white/90 drop-shadow"><span className="text-white/70">Número:</span> #{player.jersey_number}</div>
                <div className="text-white/90 drop-shadow"><span className="text-white/70">Equipo:</span> {team.name}</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2 drop-shadow-lg">Especificaciones</h4>
              <div className="space-y-1 text-sm">
                <div className="text-white/90 drop-shadow"><span className="text-white/70">Tamaño:</span> 85.6 x 53.98 mm</div>
                <div className="text-white/90 drop-shadow"><span className="text-white/70">Formato:</span> Tarjeta estándar</div>
                <div className="text-white/90 drop-shadow"><span className="text-white/70">QR:</span> Código de identificación</div>
                <div className="text-white/90 drop-shadow"><span className="text-white/70">Logo:</span> {team.logo ? 'Incluido' : 'No disponible'}</div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3">
            <Button
              onClick={handlePrint}
              disabled={printing}
              className="flex-1 backdrop-blur-md bg-blue-500/80 hover:bg-blue-500/90 text-white border-0 shadow-lg rounded-xl"
            >
              <Printer className="w-4 h-4 mr-2" />
              {printing ? 'Imprimiendo...' : 'Imprimir'}
            </Button>

            <Button
              onClick={handleDownload}
              disabled={downloading}
              variant="outline"
              className="flex-1 backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? 'Descargando...' : 'Descargar PNG'}
            </Button>
          </div>

          {/* Instrucciones */}
          <div className="p-4 backdrop-blur-md bg-amber-500/20 border border-amber-300/30 rounded-xl shadow-lg">
            <div className="flex items-start gap-2">
              <IdCard className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-white font-medium mb-1 drop-shadow-lg">Instrucciones:</p>
                <ul className="text-white/90 space-y-1 list-disc list-inside drop-shadow">
                  <li>Imprime en papel de alta calidad o cartulina</li>
                  <li>Utiliza una plastificadora para mayor durabilidad</li>
                  <li>El código QR debe ser legible para escáneres</li>
                  <li>Mantén la credencial en lugar visible durante los partidos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}