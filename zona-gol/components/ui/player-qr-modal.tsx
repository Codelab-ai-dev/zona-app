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
import { Download, Copy, Share, QrCode } from "lucide-react"
import { PlayerQRCredential, LegacyPlayerQR, getDaysUntilExpiration, getExpirationDate } from '@/lib/utils/qr-generator'

interface Player {
  id: string
  name: string
  jersey_number: number
  photo?: string | null
}

interface PlayerQRModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  player: Player
  qrData: string
  credential: PlayerQRCredential | LegacyPlayerQR
}

export function PlayerQRModal({ 
  open, 
  onOpenChange, 
  player, 
  qrData, 
  credential 
}: PlayerQRModalProps) {
  const [copying, setCopying] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const isNewFormat = 'typ' in credential
  
  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleCopyQR = async () => {
    setCopying(true)
    try {
      await navigator.clipboard.writeText(qrData)
      // Show success feedback
      setTimeout(() => setCopying(false), 2000)
    } catch (error) {
      console.error('Error copying QR data:', error)
      setCopying(false)
    }
  }

  const handleDownloadQR = () => {
    setDownloading(true)
    try {
      // Create a canvas from the QR SVG
      const svg = document.querySelector('#qr-code-svg') as SVGElement
      if (!svg) {
        throw new Error('QR code not found')
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Canvas context not available')
      }

      const img = new Image()
      const svgData = new XMLSerializer().serializeToString(svg)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      img.onload = () => {
        canvas.width = 512
        canvas.height = 512
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = downloadUrl
            a.download = `qr-${player.name.replace(/\s+/g, '_')}-${Date.now()}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(downloadUrl)
          }
        }, 'image/png')

        URL.revokeObjectURL(url)
        setDownloading(false)
      }

      img.onerror = () => {
        console.error('Error loading SVG')
        setDownloading(false)
      }

      img.src = url
    } catch (error) {
      console.error('Error downloading QR:', error)
      setDownloading(false)
    }
  }

  const handleShareQR = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `QR Credencial - ${player.name}`,
          text: `Credencial QR para ${player.name} #${player.jersey_number}`,
          url: window.location.href
        })
      } else {
        // Fallback: copy to clipboard
        await handleCopyQR()
      }
    } catch (error) {
      console.error('Error sharing QR:', error)
    }
  }

  const formatDateTime = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            Credencial QR Generada
          </DialogTitle>
          <DialogDescription>
            Código QR para identificación del jugador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del jugador */}
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <Avatar className="w-12 h-12">
              {player.photo && (
                <AvatarImage 
                  src={player.photo} 
                  alt={player.name}
                />
              )}
              <AvatarFallback className="bg-blue-100 text-blue-800 font-bold">
                {getPlayerInitials(player.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                {player.name}
                <Badge variant="secondary">#{player.jersey_number}</Badge>
              </h3>
              <p className="text-sm text-gray-600">
                {isNewFormat ? 'Formato Nuevo' : 'Formato Legacy'}
              </p>
            </div>
          </div>

          {/* Código QR */}
          <div className="flex justify-center p-6 bg-white border-2 border-gray-200 rounded-lg">
            <QRCode
              id="qr-code-svg"
              value={qrData}
              size={200}
              level="H"
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>

          {/* Información de la credencial */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Tipo:</span>
              <span className="font-medium">
                {isNewFormat ? `${(credential as PlayerQRCredential).typ} v${(credential as PlayerQRCredential).ver}` : `${(credential as LegacyPlayerQR).type} v${(credential as LegacyPlayerQR).version}`}
              </span>
            </div>
            
            {isNewFormat && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Temporada:</span>
                  <span className="font-medium">{(credential as PlayerQRCredential).season}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Válido hasta:</span>
                  <span className="font-medium">
                    {formatDateTime(getExpirationDate(credential as PlayerQRCredential))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Días restantes:</span>
                  <span className="font-medium text-green-600">
                    {getDaysUntilExpiration(credential as PlayerQRCredential)} días
                  </span>
                </div>
              </>
            )}

            {!isNewFormat && (
              <div className="flex justify-between">
                <span className="text-gray-600">Generado:</span>
                <span className="font-medium">
                  {new Date((credential as LegacyPlayerQR).timestamp).toLocaleDateString('es-ES')}
                </span>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            <Button
              onClick={handleCopyQR}
              disabled={copying}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              {copying ? 'Copiado!' : 'Copiar'}
            </Button>
            
            <Button
              onClick={handleDownloadQR}
              disabled={downloading}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading ? 'Descargando...' : 'Descargar'}
            </Button>
            
            <Button
              onClick={handleShareQR}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Share className="w-4 h-4 mr-2" />
              Compartir
            </Button>
          </div>

          {/* Instrucciones */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <QrCode className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-orange-800 font-medium mb-1">Instrucciones:</p>
                <p className="text-orange-700">
                  Imprime este QR y pégalo en la credencial del jugador para identificación rápida durante los partidos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}