"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, Loader2, ImageDown } from "lucide-react"
import { useLeagueById } from "@/lib/queries"
import { toast } from "sonner"

interface TeamStanding {
  id: string | null
  team_id: string
  tournament_id: string
  matches_played: number
  matches_won: number
  matches_drawn: number
  matches_lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  points_adjustment: number
  adjustment_reason: string | null
  team: {
    id: string
    name: string
    logo: string | null
  }
}

interface StandingsPosterGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  standings: TeamStanding[]
  leagueId: string
  tournamentName: string
}

function getTeamInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3)
}

export function StandingsPosterGenerator({ open, onOpenChange, standings, leagueId, tournamentName }: StandingsPosterGeneratorProps) {
  const [downloading, setDownloading] = useState(false)
  const posterRef = useRef<HTMLDivElement>(null)
  const { data: league } = useLeagueById(leagueId)

  const fontTitle = "Impact, 'Arial Black', Gadget, sans-serif"
  const fontBody = "Verdana, Geneva, Tahoma, sans-serif"

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const el = posterRef.current
      if (!el) throw new Error('Poster element not found')

      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1000px;height:5000px;border:none;'
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument!
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
        ...(({ window: iframe.contentWindow! }) as any),
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

  // Header cell style
  const thStyle: React.CSSProperties = {
    verticalAlign: 'middle', textAlign: 'center',
    fontFamily: fontBody, fontSize: '10px', fontWeight: 'bold',
    color: 'rgba(255,255,255,0.45)', lineHeight: '18px',
    padding: '10px 4px', letterSpacing: '1px',
    textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)',
  }

  // Data cell style
  const tdStyle: React.CSSProperties = {
    verticalAlign: 'middle', textAlign: 'center',
    fontFamily: fontBody, fontSize: '13px', fontWeight: 'bold',
    color: '#FFFFFF', lineHeight: '20px',
    padding: '0 4px',
  }

  const posterContent = (
    <div
      ref={posterRef}
      style={{
        width: '900px',
        background: '#0B0F1A',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* BG layers */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '350px',
        background: 'linear-gradient(180deg, #14243A 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px',
        background: 'linear-gradient(180deg, transparent 0%, #14243A 100%)',
        pointerEvents: 'none',
      }} />

      {/* Top gold bar */}
      <div style={{
        height: '5px', width: '100%',
        background: 'linear-gradient(90deg, #C59B2C, #F5D76E, #C59B2C)',
      }} />

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '40px 0 30px', position: 'relative' }}>
        {/* League logo */}
        <div style={{
          width: '96px', height: '96px', margin: '0 auto 20px',
          borderRadius: '50%', overflow: 'hidden',
          border: '3px solid #C59B2C', background: '#0B0F1A',
        }}>
          {league?.logo ? (
            <img
              src={league.logo} alt={league.name || 'Liga'}
              crossOrigin="anonymous"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              style={{ width: '90px', height: '90px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
            />
          ) : (
            <div style={{
              width: '90px', height: '90px', lineHeight: '90px',
              textAlign: 'center', fontSize: '30px', fontWeight: 'bold',
              color: '#C59B2C', fontFamily: fontTitle,
            }}>
              {league?.name ? getTeamInitials(league.name) : 'L'}
            </div>
          )}
        </div>

        <div style={{
          fontFamily: fontTitle, fontSize: '52px', color: '#FFFFFF',
          letterSpacing: '4px', lineHeight: '62px',
          textShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          TABLA DE POSICIONES
        </div>

        {league?.name && (
          <div style={{
            fontFamily: fontBody, fontSize: '13px', color: '#C59B2C',
            letterSpacing: '3px', textTransform: 'uppercase',
            lineHeight: '22px', marginTop: '6px',
          }}>
            {league.name}
          </div>
        )}

        <div style={{
          width: '60px', height: '3px', margin: '18px auto 0',
          background: '#C59B2C', borderRadius: '2px',
        }} />
      </div>

      {/* Standings table */}
      <div style={{ padding: '0 40px 24px', position: 'relative' }}>
        <table
          cellPadding="0" cellSpacing="0"
          style={{
            width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed',
            background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>#</th>
              <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '12px' }}>EQUIPO</th>
              <th style={{ ...thStyle, width: '48px' }}>PJ</th>
              <th style={{ ...thStyle, width: '48px' }}>PG</th>
              <th style={{ ...thStyle, width: '48px' }}>PE</th>
              <th style={{ ...thStyle, width: '48px' }}>PP</th>
              <th style={{ ...thStyle, width: '48px' }}>GF</th>
              <th style={{ ...thStyle, width: '48px' }}>GC</th>
              <th style={{ ...thStyle, width: '52px' }}>DG</th>
              <th style={{ ...thStyle, width: '56px', color: '#C59B2C' }}>PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, index) => {
              const pos = index + 1
              const totalPoints = team.points + (team.points_adjustment || 0)
              const isTop3 = pos <= 3
              const rowBg = pos % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'

              // Position indicator colors
              let posColor = '#FFFFFF'
              let posBg = 'transparent'
              if (pos === 1) { posColor = '#0B0F1A'; posBg = '#C59B2C' }
              else if (pos === 2) { posColor = '#0B0F1A'; posBg = '#A0A0A0' }
              else if (pos === 3) { posColor = '#0B0F1A'; posBg = '#CD7F32' }

              return (
                <tr key={team.team_id} style={{ background: rowBg }}>
                  {/* Position */}
                  <td style={{ ...tdStyle, width: '40px', padding: '12px 4px' }}>
                    <div style={{
                      width: '26px', height: '26px', lineHeight: '26px',
                      borderRadius: '50%', textAlign: 'center', margin: '0 auto',
                      background: posBg, color: posColor,
                      fontSize: '12px', fontWeight: 'bold', fontFamily: fontBody,
                      border: isTop3 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    }}>
                      {pos}
                    </div>
                  </td>

                  {/* Team name + logo */}
                  <td style={{
                    verticalAlign: 'middle', padding: '12px 8px 12px 12px',
                    borderBottom: 'none',
                  }}>
                    <table cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse' }}>
                      <tbody><tr>
                        <td style={{ verticalAlign: 'middle', width: '36px', padding: '0 10px 0 0' }}>
                          {team.team.logo ? (
                            <img
                              src={team.team.logo} alt={team.team.name}
                              crossOrigin="anonymous"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                              style={{
                                width: '32px', height: '32px', objectFit: 'contain',
                                borderRadius: '50%', display: 'block',
                                background: 'rgba(255,255,255,0.08)',
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '32px', height: '32px', lineHeight: '32px',
                              borderRadius: '50%', textAlign: 'center',
                              background: 'rgba(197,155,44,0.15)', border: '1px solid rgba(197,155,44,0.3)',
                              fontFamily: fontBody, fontSize: '10px', fontWeight: 'bold', color: '#C59B2C',
                            }}>
                              {getTeamInitials(team.team.name)}
                            </div>
                          )}
                        </td>
                        <td style={{
                          verticalAlign: 'middle',
                          fontFamily: fontBody, fontSize: '13px', fontWeight: 'bold',
                          color: isTop3 ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
                          lineHeight: '20px', textTransform: 'uppercase',
                        }}>
                          {team.team.name}
                        </td>
                      </tr></tbody>
                    </table>
                  </td>

                  {/* Stats */}
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)' }}>{team.matches_played}</td>
                  <td style={{ ...tdStyle, color: '#22C55E' }}>{team.matches_won}</td>
                  <td style={{ ...tdStyle, color: '#EAB308' }}>{team.matches_drawn}</td>
                  <td style={{ ...tdStyle, color: '#EF4444' }}>{team.matches_lost}</td>
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)' }}>{team.goals_for}</td>
                  <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)' }}>{team.goals_against}</td>
                  <td style={{
                    ...tdStyle,
                    color: team.goal_difference > 0 ? '#22C55E' : team.goal_difference < 0 ? '#EF4444' : 'rgba(255,255,255,0.3)',
                  }}>
                    {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                  </td>

                  {/* Points - highlighted */}
                  <td style={{
                    ...tdStyle, width: '56px', padding: '12px 4px',
                  }}>
                    <div style={{
                      fontFamily: fontTitle, fontSize: '20px',
                      color: '#FFFFFF', lineHeight: '28px',
                      textAlign: 'center',
                    }}>
                      {totalPoints}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '12px 0 0', position: 'relative' }}>
        <div style={{
          width: '100%', height: '1px',
          background: 'linear-gradient(90deg, transparent 10%, rgba(197,155,44,0.3) 50%, transparent 90%)',
        }} />
        <div style={{ padding: '20px 0 32px' }}>
          <div style={{
            fontFamily: fontTitle, fontSize: '18px', color: '#C59B2C',
            letterSpacing: '6px', lineHeight: '28px', textTransform: 'uppercase',
          }}>
            {tournamentName}
          </div>
        </div>
      </div>

      {/* Bottom gold bar */}
      <div style={{
        height: '5px', width: '100%',
        background: 'linear-gradient(90deg, #C59B2C, #F5D76E, #C59B2C)',
      }} />
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col backdrop-blur-xl bg-slate-900/95 border-white/10 text-white p-0 gap-0 overflow-hidden">
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
                {posterContent}
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
